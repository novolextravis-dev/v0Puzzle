import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

interface ToolCall {
  tool: "create_document" | "open_upload" | "run_workflow" | "query_documents" | "none"
  parameters?: {
    documentType?: string
    title?: string
    description?: string
    workflowType?: string
    query?: string
  }
}

function getGrokModel(modelSetting: string) {
  const models: Record<string, string> = {
    "grok-4": "grok-4",
    "grok-4-fast": "grok-4-fast",
    "grok-3": "grok-3",
    "grok-3-mini": "grok-3-mini",
  }
  return models[modelSetting] || "grok-4"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    let userMessage: string
    let history: Array<{ role: string; content: string }> = []

    if (body.messages && Array.isArray(body.messages)) {
      const userMessages = body.messages.filter((m: { role: string }) => m.role === "user")
      userMessage = userMessages[userMessages.length - 1]?.content || ""
      history = body.messages.slice(0, -1)
    } else {
      userMessage = body.message || ""
      history = body.history || []
    }

    const { context, coreMemory, aiSettings, uploadedDocuments } = body

    const temperature = aiSettings?.temperature ?? 0.7
    const topP = aiSettings?.topP ?? 0.9
    const maxTokens = aiSettings?.maxTokens ?? 4096
    const frequencyPenalty = aiSettings?.frequencyPenalty ?? 0
    const presencePenalty = aiSettings?.presencePenalty ?? 0
    const grokModel = getGrokModel(aiSettings?.grokModel || "grok-4")

    // Build core memory context
    let coreMemoryContext = ""
    if (coreMemory && coreMemory.length > 0 && aiSettings?.useCorememory !== false) {
      coreMemoryContext = "\n\n=== CORE MEMORY (Company Knowledge Base) ===\n"
      for (const item of coreMemory) {
        coreMemoryContext += `\n--- ${item.name} (${item.category || "general"}) ---\n`
        coreMemoryContext += `Summary: ${item.summary}\n`
        if (item.content) {
          coreMemoryContext += `Content: ${item.content.slice(0, 3000)}${item.content.length > 3000 ? "..." : ""}\n`
        }
      }
      coreMemoryContext += "\n=== END CORE MEMORY ===\n"
    }

    let documentsContext = ""
    if (uploadedDocuments && uploadedDocuments.length > 0) {
      documentsContext = "\n\n=== UPLOADED DOCUMENTS AVAILABLE ===\n"
      for (const doc of uploadedDocuments) {
        documentsContext += `\n- "${doc.name}" (${doc.type})`
        if (doc.analysis?.summary) {
          documentsContext += `: ${doc.analysis.summary.slice(0, 200)}...`
        }
        if (doc.analysis?.topics && doc.analysis.topics.length > 0) {
          documentsContext += ` [Topics: ${doc.analysis.topics.slice(0, 3).join(", ")}]`
        }
      }
      documentsContext +=
        "\n\nYou can answer questions about these documents. If the user asks about document contents, use the information available.\n=== END DOCUMENTS LIST ===\n"
    }

    // Build company context
    let companyContext = ""
    if (aiSettings?.companyName || aiSettings?.industry) {
      companyContext = `\nCompany: ${aiSettings.companyName || "Not specified"}`
      if (aiSettings.industry) {
        companyContext += ` | Industry: ${aiSettings.industry}`
      }
      companyContext += "\n"
    }

    const responseLength = aiSettings?.responseLength || "detailed"
    const tone = aiSettings?.tone || "professional"

    const lengthInstruction = {
      concise: "Keep responses brief and to the point (2-3 sentences when possible).",
      detailed: "Provide balanced, informative responses with appropriate detail.",
      comprehensive: "Provide thorough, comprehensive responses with full explanations.",
    }[responseLength]

    const toneInstruction = {
      professional: "Maintain a professional, business-appropriate tone.",
      friendly: "Use a warm, approachable tone while remaining helpful.",
      formal: "Use formal language and structured responses.",
    }[tone]

    const intentDetectionPrompt = `You are an intent classifier. Analyze the user's message and determine if they want to:
1. CREATE a document (policy, handbook, letter, checklist, report, presentation, form, procedure, memo, spreadsheet)
2. UPLOAD a document
3. RUN a workflow (onboarding, offboarding, performance review, etc.)
4. QUERY documents (ask questions about uploaded documents, search for information in documents, compare documents)
5. Just CHAT (ask questions, get information, general conversation)

Available uploaded documents: ${uploadedDocuments?.map((d: { name: string }) => d.name).join(", ") || "None"}

User message: "${userMessage}"

Respond with ONLY a JSON object in this exact format:
{
  "intent": "create_document" | "upload_document" | "run_workflow" | "query_documents" | "chat",
  "documentType": "policy" | "handbook" | "letter" | "checklist" | "report" | "presentation" | "form" | "procedure" | "memo" | "spreadsheet" | null,
  "title": "suggested title or null",
  "description": "what the user wants or null",
  "workflowType": "onboarding" | "offboarding" | "performance_review" | null,
  "documentQuery": "the question about documents if intent is query_documents, else null",
  "targetDocuments": ["document names being asked about"] or null
}`

    const { text: intentText } = await generateText({
      model: xai(grokModel),
      prompt: intentDetectionPrompt,
      maxTokens: 300,
      temperature: 0.3,
    })

    let toolCall: ToolCall = { tool: "none" }
    let intentData: {
      intent?: string
      documentType?: string
      title?: string
      description?: string
      workflowType?: string
      documentQuery?: string
      targetDocuments?: string[]
    } = {}

    try {
      const jsonMatch = intentText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        intentData = JSON.parse(jsonMatch[0])

        if (intentData.intent === "create_document" && intentData.documentType) {
          toolCall = {
            tool: "create_document",
            parameters: {
              documentType: intentData.documentType,
              title: intentData.title || undefined,
              description: intentData.description || undefined,
            },
          }
        } else if (intentData.intent === "upload_document") {
          toolCall = { tool: "open_upload" }
        } else if (intentData.intent === "run_workflow" && intentData.workflowType) {
          toolCall = {
            tool: "run_workflow",
            parameters: {
              workflowType: intentData.workflowType,
            },
          }
        } else if (intentData.intent === "query_documents" && uploadedDocuments && uploadedDocuments.length > 0) {
          toolCall = {
            tool: "query_documents",
            parameters: {
              query: intentData.documentQuery || userMessage,
            },
          }
        }
      }
    } catch {
      // If intent parsing fails, just chat normally
    }

    if (toolCall.tool !== "none" && toolCall.tool !== "query_documents") {
      let briefResponse = ""

      if (toolCall.tool === "create_document") {
        const docType = toolCall.parameters?.documentType || "document"
        briefResponse = `I'll create that ${docType} for you right now. Opening the document creator...`
      } else if (toolCall.tool === "open_upload") {
        briefResponse = "I'll open the document upload panel for you."
      } else if (toolCall.tool === "run_workflow") {
        briefResponse = `I'll start the ${toolCall.parameters?.workflowType?.replace("_", " ")} workflow for you.`
      }

      return Response.json({
        response: briefResponse,
        toolCall,
      })
    }

    if (toolCall.tool === "query_documents") {
      // Find the specific documents being queried
      const targetDocs = intentData.targetDocuments
        ? uploadedDocuments.filter((d: { name: string }) =>
            intentData.targetDocuments?.some((target) => d.name.toLowerCase().includes(target.toLowerCase())),
          )
        : uploadedDocuments

      let fullDocContext = "\n\n=== DOCUMENT CONTENTS FOR QUERY ===\n"
      const maxPerDoc = Math.floor(6000 / Math.max(targetDocs.length, 1))

      for (const doc of targetDocs.slice(0, 5)) {
        // Limit to 5 docs
        fullDocContext += `\n--- ${doc.name} ---\n`
        if (doc.analysis) {
          fullDocContext += `Summary: ${doc.analysis.summary || "N/A"}\n`
          if (doc.analysis.keyPoints?.length > 0) {
            fullDocContext += `Key Points:\n${doc.analysis.keyPoints.map((kp: string) => `• ${kp}`).join("\n")}\n`
          }
        }
        fullDocContext += `Content:\n${doc.content.slice(0, maxPerDoc)}${doc.content.length > maxPerDoc ? "...[truncated]" : ""}\n`
      }
      fullDocContext += "\n=== END DOCUMENT CONTENTS ===\n"

      const querySystemPrompt = `You are Atlas, an expert HR document analyst. Answer the user's question based ONLY on the provided document contents.

INSTRUCTIONS:
1. Answer based on the documents provided
2. Quote relevant passages when helpful
3. Cite which document(s) your answer comes from
4. If the answer isn't in the documents, say so clearly
5. Be specific and accurate

${fullDocContext}
${companyContext}
${lengthInstruction}
${toneInstruction}`

      const { text: queryResponse } = await generateText({
        model: xai(grokModel),
        system: querySystemPrompt,
        prompt: userMessage,
        maxTokens: maxTokens,
        temperature: temperature,
        topP: topP,
      })

      return Response.json({
        response: queryResponse,
        toolCall: { tool: "query_documents" },
        sources: targetDocs.map((d: { id: string; name: string; type: string }) => ({
          id: d.id,
          name: d.name,
          type: d.type,
        })),
      })
    }

    const systemPrompt = `You are Atlas, an expert HR Manager AI Assistant for ${aiSettings?.companyName || "this company"}. You help with:
- Drafting HR policies and procedures
- Summarizing employee documents and reports
- Creating onboarding checklists and workflows
- Analyzing performance reviews
- Answering HR-related questions
- Providing compliance guidance
- Answering questions about uploaded documents
${companyContext}
${lengthInstruction}
${toneInstruction}

IMPORTANT: If the user asks you to CREATE, DRAFT, MAKE, or WRITE a document, DO NOT write it inline. Instead, tell them you'll open the document creator for them. The system will handle creating professional, exportable documents.

Be helpful and accurate. Format your responses clearly with bullet points when appropriate.
${coreMemoryContext}
${documentsContext}
${context ? `\nCurrent Document Context:\n${context}\n` : ""}
`

    const conversationHistory = history
      .map((msg: { role: string; content: string }) => `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`)
      .join("\n")

    const { text } = await generateText({
      model: xai(grokModel),
      system: systemPrompt,
      prompt: `${conversationHistory}\nHuman: ${userMessage}\nAssistant:`,
      maxTokens: maxTokens,
      temperature: temperature,
      topP: topP,
      frequencyPenalty: frequencyPenalty,
      presencePenalty: presencePenalty,
    })

    return Response.json({ response: text, toolCall: null })
  } catch (error) {
    console.error("Chat API error:", error)
    return Response.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
