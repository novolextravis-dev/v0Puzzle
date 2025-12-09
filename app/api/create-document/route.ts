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

export async function POST(request: Request) {
  try {
    const { documentType, title, description, template, sections, coreMemory, aiSettings, customInstructions } =
      await request.json()

    const temperature = aiSettings?.temperature ?? 0.7
    const topP = aiSettings?.topP ?? 0.9
    const maxTokens = aiSettings?.maxTokens ?? 4096
    const frequencyPenalty = aiSettings?.frequencyPenalty ?? 0
    const presencePenalty = aiSettings?.presencePenalty ?? 0
    const grokModel = getGrokModel(aiSettings?.grokModel || "grok-4")

    // Build core memory context
    let coreMemoryContext = ""
    if (coreMemory && coreMemory.length > 0) {
      coreMemoryContext = "\n\n=== COMPANY KNOWLEDGE BASE ===\n"
      for (const item of coreMemory) {
        coreMemoryContext += `\n--- ${item.name} (${item.category || "general"}) ---\n`
        coreMemoryContext += `Summary: ${item.summary}\n`
        if (item.content) {
          coreMemoryContext += `Content: ${item.content.slice(0, 5000)}${item.content.length > 5000 ? "..." : ""}\n`
        }
      }
      coreMemoryContext += "\n=== END KNOWLEDGE BASE ===\n"
    }

    // Build company context
    let companyContext = ""
    if (aiSettings?.companyName || aiSettings?.industry) {
      companyContext = `Company: ${aiSettings.companyName || "[Company Name]"}`
      if (aiSettings.industry) {
        companyContext += ` | Industry: ${aiSettings.industry}`
      }
    }

    // Document type specific prompts
    const documentPrompts: Record<string, string> = {
      policy: `Create a comprehensive, professional HR policy document. Include:
- Policy title and effective date
- Purpose and scope
- Definitions (if applicable)
- Policy statement with clear guidelines
- Procedures for implementation
- Responsibilities
- Compliance and enforcement
- Related policies
- Revision history section`,

      handbook: `Create a professional employee handbook section. Include:
- Clear section heading
- Introduction/overview
- Detailed guidelines and expectations
- Examples where helpful
- FAQs or common scenarios
- Contact information for questions`,

      letter: `Create a professional HR letter. Include:
- Proper business letter formatting
- Clear subject/purpose
- Professional greeting
- Body with all relevant details
- Appropriate closing
- Signature block`,

      checklist: `Create a comprehensive checklist. Include:
- Clear title and purpose
- Organized categories/sections
- Checkbox items (use [ ] format)
- Responsible party for each item
- Timeline/due dates if applicable
- Notes section`,

      report: `Create a professional HR report. Include:
- Executive summary
- Key findings/metrics
- Detailed analysis
- Charts/tables (describe as markdown tables)
- Recommendations
- Next steps
- Appendices if needed`,

      presentation: `Create content for a professional presentation. Structure as:
# Slide 1: Title Slide
[Title and subtitle]

# Slide 2: Agenda/Overview
[Bullet points]

Continue with logical slide progression. Each slide should have:
- Clear heading
- 3-5 bullet points maximum
- Speaker notes in [Notes: ...] format`,

      form: `Create a professional HR form. Include:
- Form title and number
- Instructions for completion
- Clearly labeled fields (use ___ for fill-in areas)
- Required field indicators
- Sections organized logically
- Signature/date lines
- Submission instructions`,

      procedure: `Create a detailed procedure document. Include:
- Procedure title and ID
- Purpose and scope
- Prerequisites/requirements
- Step-by-step instructions (numbered)
- Decision points with alternatives
- Troubleshooting/exceptions
- Related documents
- Approval signatures`,

      memo: `Create a professional internal memo. Include:
- TO, FROM, DATE, SUBJECT headers
- Clear purpose statement
- Key information organized logically
- Action items if applicable
- Deadline/response requirements`,

      spreadsheet: `Create content structured for a spreadsheet. Use this format:
Header1 | Header2 | Header3 | Header4
Data1 | Data2 | Data3 | Data4

Include:
- Clear column headers
- Sample data rows
- Formulas described in [Formula: ...] format
- Multiple sheets if needed, separated by "=== Sheet: [Name] ==="`,
    }

    const documentTypePrompt = documentPrompts[documentType] || documentPrompts.policy

    const systemPrompt = `You are an expert HR document creator. Your task is to create professional, 
polished, and comprehensive HR documents that follow best practices and legal requirements.

${companyContext}

Document Type: ${documentType.toUpperCase()}
${documentTypePrompt}

Guidelines:
- Use professional, clear language
- Follow industry best practices
- Include all necessary sections
- Format with proper markdown (headings, bullets, numbered lists)
- Make content specific and actionable, not generic
- If company information is provided in the knowledge base, use it to personalize the document
- Include placeholders like [DATE], [EMPLOYEE NAME], etc. where specific information is needed

${coreMemoryContext}
`

    // Build the prompt
    const prompt = `Create a ${documentType} document with the following details:

Title: ${title}
${description ? `Description/Purpose: ${description}` : ""}
${sections && sections.length > 0 ? `Required Sections: ${sections.join(", ")}` : ""}
${customInstructions ? `Additional Instructions: ${customInstructions}` : ""}
${template ? `Based on template style: ${template}` : ""}

Generate a complete, professional document ready for use.`

    const { text } = await generateText({
      model: xai(grokModel),
      system: systemPrompt,
      prompt,
      maxTokens: maxTokens,
      temperature: temperature,
      topP: topP,
      frequencyPenalty: frequencyPenalty,
      presencePenalty: presencePenalty,
    })

    return Response.json({
      success: true,
      content: text,
      documentType,
      title,
    })
  } catch (error) {
    console.error("Create document API error:", error)
    return Response.json(
      {
        error: "Failed to create document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
