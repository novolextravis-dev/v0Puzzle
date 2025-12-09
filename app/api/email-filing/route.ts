import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

// This endpoint receives documents from email webhook services like SendGrid, Mailgun, or Postmark
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || ""

    let body: {
      from?: string
      to?: string
      subject?: string
      text?: string
      html?: string
      attachments?: Array<{
        filename: string
        content: string // base64 encoded
        contentType: string
        size: number
      }>
      // Webhook verification
      webhookSecret?: string
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      body = {
        from: formData.get("from") as string,
        to: formData.get("to") as string,
        subject: formData.get("subject") as string,
        text: formData.get("text") as string,
        html: formData.get("html") as string,
        webhookSecret: formData.get("webhookSecret") as string,
        attachments: [],
      }

      // Process file attachments from form data
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          const buffer = await value.arrayBuffer()
          const base64 = Buffer.from(buffer).toString("base64")
          body.attachments?.push({
            filename: value.name,
            content: base64,
            contentType: value.type,
            size: value.size,
          })
        }
      }
    } else {
      body = await req.json()
    }

    const { from, subject, text, attachments = [] } = body

    if (!attachments || attachments.length === 0) {
      // If no attachments, create a document from the email body itself
      if (text || body.html) {
        const emailContent = text || body.html || ""

        // Use AI to categorize the email content
        const { text: categoryResult } = await generateText({
          model: xai("grok-4"),
          prompt: `Analyze this email and categorize it for HR filing.

Email From: ${from || "Unknown"}
Subject: ${subject || "No Subject"}
Content: ${emailContent.substring(0, 2000)}

Respond with JSON only:
{
  "category": "contracts|resumes|policies|forms|correspondence|reports|payroll|benefits|training|performance|legal|other",
  "priority": "low|medium|high|urgent",
  "summary": "Brief 1-2 sentence summary",
  "tags": ["tag1", "tag2"],
  "extractedData": {
    "date": "extracted date if any",
    "employeeName": "employee name if mentioned",
    "department": "department if mentioned"
  }
}`,
        })

        let parsed
        try {
          const jsonMatch = categoryResult.match(/\{[\s\S]*\}/)
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
        } catch {
          parsed = {
            category: "correspondence",
            priority: "medium",
            summary: `Email from ${from}: ${subject}`,
            tags: ["email"],
            extractedData: {},
          }
        }

        const filedDoc = {
          id: `email-${Date.now()}`,
          name: subject || "Email Document",
          originalName: `${subject || "email"}.txt`,
          content: emailContent,
          category: parsed.category || "correspondence",
          tags: parsed.tags || ["email"],
          priority: parsed.priority || "medium",
          status: "pending",
          summary: parsed.summary || `Email received from ${from}`,
          extractedData: parsed.extractedData || {},
          filedAt: Date.now(),
          receivedDate: new Date().toISOString().split("T")[0],
          fileType: "txt",
          fileSize: emailContent.length,
          source: "email",
          emailFrom: from,
          emailSubject: subject,
        }

        return NextResponse.json({
          success: true,
          message: "Email filed successfully",
          document: filedDoc,
        })
      }

      return NextResponse.json({ success: false, error: "No content or attachments found" }, { status: 400 })
    }

    // Process each attachment
    const processedDocuments = []

    for (const attachment of attachments) {
      const { filename, content, contentType, size } = attachment

      // Decode base64 content for text-based files
      let textContent = ""
      try {
        if (
          contentType.includes("text") ||
          contentType.includes("pdf") ||
          filename.endsWith(".txt") ||
          filename.endsWith(".csv")
        ) {
          textContent = Buffer.from(content, "base64").toString("utf-8")
        } else {
          textContent = `[Binary file: ${filename}]`
        }
      } catch {
        textContent = `[Unable to decode: ${filename}]`
      }

      // Use AI to categorize
      const { text: categoryResult } = await generateText({
        model: xai("grok-4"),
        prompt: `Analyze this document attachment for HR filing.

Filename: ${filename}
Content Type: ${contentType}
Size: ${size} bytes
Email From: ${from || "Unknown"}
Email Subject: ${subject || "No Subject"}
Content Preview: ${textContent.substring(0, 1500)}

Categorize this document for an HR department. Respond with JSON only:
{
  "category": "contracts|resumes|policies|forms|correspondence|reports|payroll|benefits|training|performance|legal|other",
  "priority": "low|medium|high|urgent",
  "summary": "Brief 1-2 sentence summary of document",
  "tags": ["tag1", "tag2", "tag3"],
  "extractedData": {
    "date": "any date found",
    "parties": ["party names if contract"],
    "amount": "monetary amount if any",
    "deadline": "deadline if any",
    "employeeName": "employee name if found",
    "department": "department if mentioned"
  }
}`,
      })

      let parsed
      try {
        const jsonMatch = categoryResult.match(/\{[\s\S]*\}/)
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch {
        parsed = {
          category: "other",
          priority: "medium",
          summary: `Document: ${filename}`,
          tags: [contentType.split("/")[1] || "document"],
          extractedData: {},
        }
      }

      const fileExt = filename.split(".").pop()?.toLowerCase() || "unknown"

      const filedDoc = {
        id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        name: parsed.summary?.substring(0, 50) || filename,
        originalName: filename,
        content: textContent,
        preview: textContent.substring(0, 500),
        category: parsed.category || "other",
        tags: parsed.tags || [],
        priority: parsed.priority || "medium",
        status: "pending",
        summary: parsed.summary || `Attachment from email: ${subject}`,
        extractedData: parsed.extractedData || {},
        filedAt: Date.now(),
        receivedDate: new Date().toISOString().split("T")[0],
        fileType: fileExt,
        fileSize: size,
        source: "email",
        emailFrom: from,
        emailSubject: subject,
      }

      processedDocuments.push(filedDoc)
    }

    return NextResponse.json({
      success: true,
      message: `Filed ${processedDocuments.length} document(s) from email`,
      documents: processedDocuments,
    })
  } catch (error) {
    console.error("Email filing error:", error)
    return NextResponse.json({ success: false, error: "Failed to process email" }, { status: 500 })
  }
}

// GET endpoint to check webhook status
export async function GET() {
  return NextResponse.json({
    status: "active",
    message: "Email filing webhook is ready to receive documents",
    supportedFormats: ["PDF", "DOCX", "TXT", "CSV", "XLSX", "Images"],
    instructions: {
      sendgrid: "Configure Inbound Parse webhook to POST to this URL",
      mailgun: "Set up Routes to forward to this webhook",
      postmark: "Configure Inbound webhook in server settings",
      manual: "POST multipart/form-data with 'from', 'subject', 'text', and file attachments",
    },
  })
}
