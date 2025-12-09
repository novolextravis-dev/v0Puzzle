import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"
import { NextResponse } from "next/server"

function getGrokModel(modelSetting: string) {
  const models: Record<string, string> = {
    "grok-4": "grok-4",
    "grok-4-fast": "grok-4-fast",
    "grok-3": "grok-3",
    "grok-3-mini": "grok-3-mini",
  }
  return models[modelSetting] || "grok-4"
}

interface WorkflowStep {
  id: string
  type: "document" | "email" | "task" | "approval"
  title: string
  config?: {
    documentType?: string
    recipientRole?: string
    taskCategory?: string
    approverLevel?: string
  }
}

interface WorkflowContext {
  companyName?: string
  employeeName?: string
  position?: string
  department?: string
  startDate?: string
  coreMemory?: Array<{ summary: string; content: string }>
  previousOutputs?: Record<string, string>
  aiSettings?: {
    temperature?: number
    topP?: number
    maxTokens?: number
    frequencyPenalty?: number
    presencePenalty?: number
    grokModel?: string
  }
}

export async function POST(req: Request) {
  try {
    const { step, context, stepIndex, totalSteps } = (await req.json()) as {
      step: WorkflowStep
      context: WorkflowContext
      stepIndex: number
      totalSteps: number
    }

    const aiSettings = context.aiSettings || {}
    const temperature = aiSettings.temperature ?? 0.7
    const topP = aiSettings.topP ?? 0.9
    const maxTokens = aiSettings.maxTokens ?? 2000
    const frequencyPenalty = aiSettings.frequencyPenalty ?? 0
    const presencePenalty = aiSettings.presencePenalty ?? 0
    const grokModel = getGrokModel(aiSettings.grokModel || "grok-4")

    const coreMemoryContext = context.coreMemory?.length
      ? `\n\nCompany Knowledge Base:\n${context.coreMemory.map((m) => `- ${m.summary}`).join("\n")}`
      : ""

    const previousOutputsContext = context.previousOutputs
      ? `\n\nPrevious workflow outputs:\n${Object.entries(context.previousOutputs)
          .map(([k, v]) => `${k}: ${v.substring(0, 200)}...`)
          .join("\n")}`
      : ""

    let prompt = ""

    switch (step.type) {
      case "document":
        prompt = `You are an HR assistant helping with: "${step.title}"
        
Context:
- Company: ${context.companyName || "Not specified"}
- Employee: ${context.employeeName || "New Employee"}
- Position: ${context.position || "Not specified"}
- Department: ${context.department || "Not specified"}
- Start Date: ${context.startDate || "Not specified"}
${coreMemoryContext}
${previousOutputsContext}

Generate a professional HR document for this task. Include all necessary sections, proper formatting, and placeholder fields where specific information is needed. Make it comprehensive and ready to use.`
        break

      case "email":
        prompt = `You are an HR assistant helping with: "${step.title}"
        
Context:
- Company: ${context.companyName || "Not specified"}
- Employee: ${context.employeeName || "New Employee"}
- Position: ${context.position || "Not specified"}
- Department: ${context.department || "Not specified"}
${coreMemoryContext}
${previousOutputsContext}

Compose a professional email for this HR task. Include:
- Subject line
- Professional greeting
- Clear message body
- Call to action if needed
- Professional signature placeholder

Make it warm yet professional.`
        break

      case "task":
        prompt = `You are an HR assistant helping with: "${step.title}"
        
Context:
- Company: ${context.companyName || "Not specified"}
- Employee: ${context.employeeName || "New Employee"}
- Position: ${context.position || "Not specified"}
- Department: ${context.department || "Not specified"}
${coreMemoryContext}
${previousOutputsContext}

Create a detailed task checklist for this HR activity. Include:
- Clear task title
- Step-by-step instructions
- Required resources/materials
- Estimated time for each step
- Person responsible
- Deadline recommendations

Format as a structured checklist that can be easily followed.`
        break

      case "approval":
        prompt = `You are an HR assistant helping with: "${step.title}"
        
Context:
- Company: ${context.companyName || "Not specified"}
- Employee: ${context.employeeName || "New Employee"}
- Position: ${context.position || "Not specified"}
- Department: ${context.department || "Not specified"}
- Step ${stepIndex + 1} of ${totalSteps}
${coreMemoryContext}
${previousOutputsContext}

Create an approval request document that includes:
- Summary of what needs approval
- Key details for the approver to review
- Recommendation (if applicable)
- Space for approver signature/comments
- Deadline for approval

Format it professionally for management review.`
        break

      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }

    const { text } = await generateText({
      model: xai(grokModel),
      prompt,
      maxTokens: maxTokens,
      temperature: temperature,
      topP: topP,
      frequencyPenalty: frequencyPenalty,
      presencePenalty: presencePenalty,
    })

    return NextResponse.json({
      success: true,
      stepId: step.id,
      output: text,
      type: step.type,
      title: step.title,
    })
  } catch (error) {
    console.error("Workflow execution error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to execute workflow step" },
      { status: 500 },
    )
  }
}
