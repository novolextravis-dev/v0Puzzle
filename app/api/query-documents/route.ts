import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

function getGrokModel(modelSetting: string) {
  const models: Record<string, string> = {
    "grok-4": "grok-4",
    "grok-4-fast": "grok-4-fast",
    "grok-3": "grok-3",
    "grok-3-mini": "grok-3-mini",
  }
  return models[modelSetting] || "grok-4"
}

interface DocumentContext {
  id: string
  name: string
  type: string
  content: string
  summary?: string
  keyPoints?: string[]
  topics?: string[]
}

export async function POST(request: Request) {
  try {
    const { query, documents, aiSettings, conversationHistory } = await request.json()

    const temperature = aiSettings?.temperature ?? 0.7
    const topP = aiSettings?.topP ?? 0.9
    const maxTokens = aiSettings?.maxTokens ?? 4096
    const grokModel = getGrokModel(aiSettings?.grokModel || "grok-4")

    if (!documents || documents.length === 0) {
      return Response.json({
        response:
          "I don't have any documents to search through. Please upload some documents first, and I'll be able to answer questions about them.",
        sources: [],
      })
    }

    // Build document context with intelligent truncation
    let documentContext = "=== UPLOADED DOCUMENTS ===\n\n"
    const maxContentPerDoc = Math.floor(8000 / documents.length)

    const relevantDocs: DocumentContext[] = documents.map((doc: DocumentContext) => {
      const truncatedContent = doc.content.slice(0, maxContentPerDoc)
      documentContext += `--- Document: ${doc.name} (${doc.type}) ---\n`

      if (doc.summary) {
        documentContext += `Summary: ${doc.summary}\n`
      }
      if (doc.keyPoints && doc.keyPoints.length > 0) {
        documentContext += `Key Points:\n${doc.keyPoints.map((kp) => `- ${kp}`).join("\n")}\n`
      }
      if (doc.topics && doc.topics.length > 0) {
        documentContext += `Topics: ${doc.topics.join(", ")}\n`
      }
      documentContext += `Content:\n${truncatedContent}${doc.content.length > maxContentPerDoc ? "...[truncated]" : ""}\n\n`

      return doc
    })

    documentContext += "=== END DOCUMENTS ===\n"

    // Build conversation history
    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? conversationHistory
            .map(
              (msg: { role: string; content: string }) =>
                `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`,
            )
            .join("\n") + "\n"
        : ""

    const systemPrompt = `You are Atlas, an expert HR document analyst. You have access to the user's uploaded documents and can answer questions about them.

IMPORTANT INSTRUCTIONS:
1. Answer questions ONLY based on the information in the provided documents
2. If the answer isn't in the documents, say so clearly
3. Always cite which document(s) your answer comes from
4. Be specific and quote relevant passages when helpful
5. If asked to compare documents, provide structured comparisons
6. Highlight any inconsistencies or conflicts between documents if found

${documentContext}

When answering:
- Start with a direct answer to the question
- Provide supporting details from the documents
- End with the source document name(s)
- If information spans multiple documents, synthesize it coherently`

    const { text } = await generateText({
      model: xai(grokModel),
      system: systemPrompt,
      prompt: `${historyContext}Human: ${query}\nAssistant:`,
      maxTokens: maxTokens,
      temperature: temperature,
      topP: topP,
    })

    // Extract which documents were likely referenced
    const referencedDocs = relevantDocs.filter(
      (doc) =>
        text.toLowerCase().includes(doc.name.toLowerCase()) ||
        doc.topics?.some((topic) => text.toLowerCase().includes(topic.toLowerCase())),
    )

    return Response.json({
      response: text,
      sources: referencedDocs.map((d) => ({ id: d.id, name: d.name, type: d.type })),
    })
  } catch (error) {
    console.error("Query documents error:", error)
    return Response.json({ error: "Failed to query documents" }, { status: 500 })
  }
}
