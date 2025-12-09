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

export async function POST(req: Request) {
  try {
    const { content, fileName, fileType, aiSettings } = await req.json()

    if (!content) {
      return Response.json({ error: "No content provided" }, { status: 400 })
    }

    const temperature = aiSettings?.temperature ?? 0.5 // Lower for categorization
    const topP = aiSettings?.topP ?? 0.9
    const grokModel = getGrokModel(aiSettings?.grokModel || "grok-4")

    const systemPrompt = `You are an expert HR document categorization AI. Analyze the provided document and extract key information.

You must respond with a valid JSON object containing:
{
  "category": one of ["contracts", "resumes", "policies", "forms", "correspondence", "reports", "payroll", "benefits", "training", "performance", "legal", "other"],
  "subcategory": a more specific subcategory string,
  "tags": array of relevant tags (max 5),
  "priority": one of ["low", "medium", "high", "urgent"],
  "summary": a brief 1-2 sentence summary of the document,
  "extractedData": {
    "date": any relevant date found (ISO format if possible),
    "parties": array of people/companies mentioned,
    "amount": any monetary amounts mentioned,
    "deadline": any deadlines mentioned,
    "employeeName": employee name if applicable,
    "department": department if mentioned
  },
  "suggestedName": a clean, descriptive filename for this document
}

Categories explained:
- contracts: Employment contracts, NDAs, agreements
- resumes: CVs, resumes, job applications
- policies: Company policies, procedures, guidelines
- forms: HR forms, applications, requests
- correspondence: Letters, emails, memos
- reports: Performance reports, analytics, summaries
- payroll: Pay stubs, tax forms, compensation
- benefits: Insurance, 401k, PTO documents
- training: Training materials, certifications
- performance: Reviews, evaluations, feedback
- legal: Legal documents, compliance, regulations
- other: Documents that don't fit other categories`

    const { text } = await generateText({
      model: xai(grokModel),
      system: systemPrompt,
      prompt: `Analyze and categorize this document:

File Name: ${fileName}
File Type: ${fileType}

Content:
${content.substring(0, 8000)}`,
      temperature: temperature,
      topP: topP,
    })

    // Parse the JSON response
    let result
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch {
      result = {
        category: "other",
        subcategory: "Uncategorized",
        tags: ["needs-review"],
        priority: "medium",
        summary: "Document requires manual review for categorization.",
        extractedData: {},
        suggestedName: fileName,
      }
    }

    return Response.json(result)
  } catch (error) {
    console.error("Categorization error:", error)
    return Response.json({ error: "Failed to categorize document" }, { status: 500 })
  }
}
