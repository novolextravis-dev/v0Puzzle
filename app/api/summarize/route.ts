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
    const { content, type, aiSettings } = await request.json()

    const temperature = aiSettings?.temperature ?? 0.7
    const topP = aiSettings?.topP ?? 0.9
    const maxTokens = aiSettings?.maxTokens ?? 800
    const grokModel = getGrokModel(aiSettings?.grokModel || "grok-4")

    let prompt = ""

    switch (type) {
      case "performance":
        prompt = `Summarize this performance review document, highlighting:
- Overall performance rating
- Key strengths
- Areas for improvement
- Goals achieved
- Recommended actions

Document:
${content}`
        break

      case "general":
      default:
        prompt = `Provide a concise summary of this HR document:
- Main points
- Key decisions or actions
- Important dates or deadlines
- Follow-up items

Document:
${content}`
    }

    const { text } = await generateText({
      model: xai(grokModel),
      prompt,
      maxTokens: maxTokens,
      temperature: temperature,
      topP: topP,
    })

    return Response.json({ summary: text })
  } catch (error) {
    console.error("Summarize error:", error)
    return Response.json({ error: "Failed to summarize" }, { status: 500 })
  }
}
