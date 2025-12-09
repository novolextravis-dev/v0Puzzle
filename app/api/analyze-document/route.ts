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
    const { content, fileName, aiSettings, deepAnalysis, documentType, existingDocuments } = await request.json()

    const temperature = aiSettings?.temperature ?? 0.4 // Lower temperature for more consistent analysis
    const topP = aiSettings?.topP ?? 0.9
    const maxTokens = aiSettings?.maxTokens ?? 8192 // Increased for comprehensive analysis
    const frequencyPenalty = aiSettings?.frequencyPenalty ?? 0.1
    const presencePenalty = aiSettings?.presencePenalty ?? 0.1
    const grokModel = getGrokModel(aiSettings?.grokModel || "grok-4")

    let existingDocsContext = ""
    if (existingDocuments && existingDocuments.length > 0) {
      existingDocsContext = `\n\nEXISTING DOCUMENTS IN SYSTEM (for relationship mapping):
${existingDocuments.map((d: { name: string; topics?: string[] }) => `- ${d.name}: Topics: ${d.topics?.join(", ") || "N/A"}`).join("\n")}`
    }

    const prompt = `You are an expert HR document analyst with deep knowledge of employment law, HR best practices, and organizational management. Perform a comprehensive analysis of this HR document.

DOCUMENT INFORMATION:
- File Name: ${fileName}
- Detected Type: ${documentType || "auto-detect"}
${existingDocsContext}

DOCUMENT CONTENT:
"""
${content.slice(0, 15000)}${content.length > 15000 ? "\n...[content truncated for analysis]" : ""}
"""

Analyze this document thoroughly and respond with ONLY a valid JSON object matching this schema exactly:

{
  "summary": "A comprehensive 3-4 paragraph executive summary covering the document's purpose, key contents, and significance for HR operations",
  
  "keyPoints": [
    "Detailed key point 1 with specific information",
    "Detailed key point 2 with specific information",
    "...include 5-10 specific, actionable key points"
  ],
  
  "actionItems": [
    {
      "task": "Specific action required",
      "priority": "high" | "medium" | "low",
      "deadline": "If mentioned, otherwise null",
      "assignee": "If mentioned, otherwise 'HR Team'"
    }
  ],
  
  "entities": {
    "people": ["Full names of individuals mentioned"],
    "organizations": ["Companies, departments, teams, vendors"],
    "dates": ["All dates with context, e.g., 'January 15, 2025 - effective date'"],
    "amounts": ["Money amounts with context, e.g., '$50,000 annual salary'"],
    "locations": ["Offices, addresses, regions"],
    "jobTitles": ["All job titles and positions mentioned"],
    "policies": ["Referenced policies, procedures, or guidelines"],
    "benefits": ["Any benefits, perks, or compensation items"],
    "legalTerms": ["Legal clauses, compliance requirements, regulations"]
  },
  
  "topics": ["Primary topic", "Secondary topic", "...3-8 categorized topics"],
  
  "categories": {
    "primary": "recruitment" | "onboarding" | "compensation" | "benefits" | "performance" | "training" | "compliance" | "termination" | "policy" | "employee-relations" | "other",
    "secondary": ["additional relevant categories"]
  },
  
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "tone": "formal" | "informal" | "legal" | "instructional" | "conversational",
  
  "confidenceScore": 0.0 to 1.0,
  
  "riskAssessment": {
    "level": "low" | "medium" | "high" | "critical",
    "factors": ["List of risk factors identified"],
    "mitigations": ["Suggested risk mitigations"]
  },
  
  "complianceAnalysis": {
    "regulations": ["Relevant regulations (FMLA, ADA, FLSA, etc.)"],
    "status": "compliant" | "needs-review" | "non-compliant" | "not-applicable",
    "concerns": ["Specific compliance concerns"],
    "recommendations": ["Compliance recommendations"]
  },
  
  "suggestedQuestions": [
    "Insightful question 1 someone might ask about this document",
    "Question 2",
    "...5-8 contextually relevant questions"
  ],
  
  "relatedTopics": ["Topics that would be useful to cross-reference"],
  
  "documentMetadata": {
    "documentType": "contract" | "policy" | "handbook" | "letter" | "form" | "report" | "memo" | "resume" | "review" | "training" | "other",
    "urgency": "routine" | "time-sensitive" | "urgent" | "critical",
    "retentionPeriod": "Suggested retention period based on document type",
    "accessLevel": "public" | "internal" | "confidential" | "restricted"
  },
  
  "insights": [
    {
      "type": "observation" | "recommendation" | "warning" | "opportunity",
      "title": "Brief insight title",
      "description": "Detailed insight explanation",
      "impact": "high" | "medium" | "low"
    }
  ],
  
  "relatedDocuments": ["Names of documents from the existing system that relate to this one"],
  
  "quickFacts": {
    "effectiveDate": "If found",
    "expirationDate": "If found",
    "lastReviewed": "If found",
    "owner": "Document owner if mentioned",
    "version": "Version number if found"
  }
}

ANALYSIS GUIDELINES:
1. Be thorough and extract ALL relevant HR information
2. Identify any potential legal or compliance issues
3. Flag time-sensitive items appropriately
4. Connect this document to existing documents when relevant
5. Provide actionable insights for HR professionals
6. Consider employee impact and organizational implications

Respond with ONLY the JSON object, no additional text.`

    const { text } = await generateText({
      model: xai(grokModel),
      prompt,
      maxTokens: maxTokens,
      temperature: temperature,
      topP: topP,
      frequencyPenalty: frequencyPenalty,
      presencePenalty: presencePenalty,
    })

    // Parse the JSON response
    let analysis
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
        analysis.analyzedAt = Date.now()
        analysis.modelUsed = grokModel

        analysis.keyPoints = analysis.keyPoints || []
        analysis.actionItems = analysis.actionItems || []
        analysis.entities = analysis.entities || {}
        analysis.topics = analysis.topics || []
        analysis.suggestedQuestions = analysis.suggestedQuestions || []
        analysis.insights = analysis.insights || []
        analysis.complianceAnalysis = analysis.complianceAnalysis || {
          status: "not-applicable",
          regulations: [],
          concerns: [],
          recommendations: [],
        }
        analysis.riskAssessment = analysis.riskAssessment || { level: "low", factors: [], mitigations: [] }
        analysis.documentMetadata = analysis.documentMetadata || {
          documentType: "other",
          urgency: "routine",
          accessLevel: "internal",
        }
        analysis.quickFacts = analysis.quickFacts || {}
        analysis.categories = analysis.categories || { primary: "other", secondary: [] }
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      // Fallback to basic analysis
      return Response.json({
        analysis: {
          summary: text.slice(0, 1000),
          keyPoints: [],
          actionItems: [],
          entities: {},
          topics: [],
          sentiment: "neutral",
          confidenceScore: 0.5,
          suggestedQuestions: [],
          analyzedAt: Date.now(),
          parseError: true,
        },
        analysisText: text,
        warning: "Full structured analysis could not be parsed, showing basic analysis",
      })
    }

    return Response.json({ analysis, success: true })
  } catch (error) {
    console.error("Analyze document error:", error)
    return Response.json(
      { error: "Failed to analyze document", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
