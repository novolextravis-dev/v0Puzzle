import type { NextRequest } from "next/server"
import { parsePPTX, pptxToText, pptxToStructuredJSON } from "@/lib/pptx-parser"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

const SUPPORTED_TYPES = {
  // Documents
  pdf: { mime: ["application/pdf"], category: "document" },
  docx: { mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], category: "document" },
  doc: { mime: ["application/msword"], category: "document" },
  txt: { mime: ["text/plain"], category: "text" },
  rtf: { mime: ["application/rtf", "text/rtf"], category: "document" },
  // Spreadsheets
  xlsx: { mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], category: "spreadsheet" },
  xls: { mime: ["application/vnd.ms-excel"], category: "spreadsheet" },
  csv: { mime: ["text/csv", "application/csv"], category: "spreadsheet" },
  // Presentations
  pptx: {
    mime: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    category: "presentation",
  },
  ppt: { mime: ["application/vnd.ms-powerpoint"], category: "presentation" },
  // Images (for OCR)
  jpg: { mime: ["image/jpeg"], category: "image" },
  jpeg: { mime: ["image/jpeg"], category: "image" },
  png: { mime: ["image/png"], category: "image" },
  tiff: { mime: ["image/tiff"], category: "image" },
  webp: { mime: ["image/webp"], category: "image" },
  // Other
  json: { mime: ["application/json"], category: "data" },
  xml: { mime: ["application/xml", "text/xml"], category: "data" },
  html: { mime: ["text/html"], category: "document" },
  md: { mime: ["text/markdown"], category: "text" },
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return Response.json({ error: "File too large. Maximum size is 50MB." }, { status: 400 })
    }

    const fileType = file.type
    const fileName = file.name.toLowerCase()
    const ext = fileName.split(".").pop() || ""

    const metadata: Record<string, unknown> = {
      fileName: file.name,
      fileType,
      extension: ext,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      processedAt: new Date().toISOString(),
      processingStages: [] as string[],
    }

    const addStage = (stage: string) => {
      ;(metadata.processingStages as string[]).push(`${stage} (${Date.now() - startTime}ms)`)
    }

    addStage("File received")

    const arrayBuffer = await file.arrayBuffer()
    addStage("Buffer loaded")

    // Detect file type
    const detectedType = detectFileType(ext, fileType)
    metadata.detectedType = detectedType
    metadata.category = SUPPORTED_TYPES[detectedType as keyof typeof SUPPORTED_TYPES]?.category || "unknown"

    let content = ""
    let structuredData: object | null = null
    let extractionMethod = "unknown"
    let confidence = 0

    try {
      switch (detectedType) {
        case "txt":
        case "md":
          content = await file.text()
          extractionMethod = "direct-text"
          confidence = 1.0
          metadata.lineCount = content.split("\n").length
          break

        case "csv":
          content = await file.text()
          extractionMethod = "csv-parse"
          confidence = 1.0
          const csvData = parseCSV(content)
          structuredData = csvData
          metadata.headers = csvData.headers
          metadata.rowCount = csvData.rows.length
          break

        case "json":
          const jsonText = await file.text()
          try {
            structuredData = JSON.parse(jsonText)
            content = JSON.stringify(structuredData, null, 2)
            extractionMethod = "json-parse"
            confidence = 1.0
          } catch {
            content = jsonText
            extractionMethod = "json-raw"
            confidence = 0.5
          }
          break

        case "html":
          content = await extractTextFromHTML(await file.text())
          extractionMethod = "html-strip"
          confidence = 0.9
          break

        case "xml":
          content = await extractTextFromXML(await file.text())
          extractionMethod = "xml-strip"
          confidence = 0.9
          break

        case "pdf":
          addStage("PDF extraction starting")
          const pdfResult = await extractTextFromPDF(arrayBuffer)
          content = pdfResult.text
          extractionMethod = pdfResult.method
          confidence = pdfResult.confidence
          metadata.pageCount = pdfResult.pageCount
          addStage("PDF extraction complete")
          break

        case "docx":
          addStage("DOCX extraction starting")
          const docxResult = await extractTextFromDOCX(arrayBuffer)
          content = docxResult.text
          structuredData = docxResult.structure
          extractionMethod = "docx-xml"
          confidence = docxResult.confidence
          metadata.paragraphCount = docxResult.paragraphCount
          addStage("DOCX extraction complete")
          break

        case "xlsx":
        case "xls":
          addStage("Excel extraction starting")
          const xlsxResult = await extractTextFromXLSX(arrayBuffer)
          content = xlsxResult.text
          structuredData = xlsxResult.structure
          extractionMethod = "xlsx-xml"
          confidence = xlsxResult.confidence
          metadata.sheetCount = xlsxResult.sheetCount
          metadata.totalRows = xlsxResult.totalRows
          addStage("Excel extraction complete")
          break

        case "pptx":
        case "ppt":
          addStage("PowerPoint extraction starting")
          try {
            const pptxDoc = await parsePPTX(arrayBuffer)
            content = pptxToText(pptxDoc)
            structuredData = pptxToStructuredJSON(pptxDoc)
            extractionMethod = "pptx-full"
            confidence = 0.95
            metadata.slideCount = pptxDoc.slides.length
            metadata.presentationTitle = pptxDoc.metadata.title
            metadata.author = pptxDoc.metadata.author
            metadata.slides = pptxDoc.slides.map((s) => ({
              number: s.slideNumber,
              title: s.title,
              hasNotes: !!s.notes,
              contentLength: s.bodyText.join(" ").length,
            }))
          } catch (pptxError) {
            content = `PowerPoint parsing error: ${pptxError instanceof Error ? pptxError.message : "Unknown"}`
            extractionMethod = "pptx-failed"
            confidence = 0
            metadata.error = pptxError instanceof Error ? pptxError.message : "Unknown error"
          }
          addStage("PowerPoint extraction complete")
          break

        case "jpg":
        case "jpeg":
        case "png":
        case "tiff":
        case "webp":
          addStage("Image OCR starting")
          const ocrResult = await extractTextFromImage(arrayBuffer, file.type)
          content = ocrResult.text
          extractionMethod = ocrResult.method
          confidence = ocrResult.confidence
          metadata.imageWidth = ocrResult.width
          metadata.imageHeight = ocrResult.height
          addStage("Image OCR complete")
          break

        default:
          // Fallback: try to read as text
          try {
            content = await file.text()
            if (content && content.length > 0 && isPrintableText(content)) {
              extractionMethod = "fallback-text"
              confidence = 0.5
            } else {
              content = "File uploaded but text extraction is not supported for this format."
              extractionMethod = "unsupported"
              confidence = 0
            }
          } catch {
            content = "File uploaded but could not be read as text."
            extractionMethod = "failed"
            confidence = 0
          }
      }
    } catch (extractError) {
      content = `Extraction error: ${extractError instanceof Error ? extractError.message : "Unknown"}`
      extractionMethod = "error"
      confidence = 0
      metadata.extractionError = extractError instanceof Error ? extractError.message : "Unknown"
    }

    addStage("Content extraction complete")

    if (confidence < 0.7 && content.length > 100 && process.env.XAI_API_KEY) {
      try {
        addStage("AI enhancement starting")
        const enhanced = await enhanceExtractedContent(content, fileName)
        if (enhanced.improved) {
          content = enhanced.text
          metadata.aiEnhanced = true
          metadata.originalConfidence = confidence
          confidence = Math.min(confidence + 0.2, 0.9)
        }
        addStage("AI enhancement complete")
      } catch {
        // AI enhancement failed, continue with original
      }
    }

    const stats = generateDocumentStats(content)

    const language = detectLanguage(content)

    const preview = content.slice(0, 500) + (content.length > 500 ? "..." : "")
    const processingTime = Date.now() - startTime
    addStage("Processing complete")

    return Response.json({
      success: true,
      content,
      structuredData,
      preview,
      metadata: {
        ...metadata,
        type: detectedType,
        extractionMethod,
        confidence,
        language,
        processingTimeMs: processingTime,
      },
      stats,
      characterCount: content.length,
      wordCount: stats.wordCount,
    })
  } catch (error) {
    console.error("Parse document error:", error)
    return Response.json(
      {
        error: "Failed to parse document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function detectFileType(ext: string, mimeType: string): string {
  // First try extension
  if (ext && SUPPORTED_TYPES[ext as keyof typeof SUPPORTED_TYPES]) {
    return ext
  }
  // Then try MIME type
  for (const [type, config] of Object.entries(SUPPORTED_TYPES)) {
    if (config.mime.some((m) => mimeType.includes(m) || mimeType.includes(type))) {
      return type
    }
  }
  return ext || "unknown"
}

function isPrintableText(text: string): boolean {
  const printableRatio = text.replace(/[^\x20-\x7E\n\r\t]/g, "").length / text.length
  return printableRatio > 0.8
}

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split("\n").filter((line) => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow)

  return { headers, rows }
}

function extractTextFromHTML(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

function extractTextFromXML(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{
  text: string
  method: string
  confidence: number
  pageCount?: number
}> {
  try {
    const uint8Array = new Uint8Array(arrayBuffer)
    const text = new TextDecoder("utf-8", { fatal: false }).decode(uint8Array)

    const textMatches: string[] = []

    // Method 1: BT/ET text blocks
    const btEtRegex = /BT[\s\S]*?ET/g
    const streams = text.match(btEtRegex) || []

    for (const stream of streams) {
      // Tj operator (single string)
      const tjMatches = stream.match(/$$([^)]*)$$\s*Tj/g) || []
      for (const match of tjMatches) {
        const extracted = match.match(/$$([^)]*)$$/)?.[1]
        if (extracted) textMatches.push(extracted)
      }

      // TJ operator (array of strings)
      const tjArrayMatches = stream.match(/\[([^\]]*)\]\s*TJ/gi) || []
      for (const match of tjArrayMatches) {
        const parts = match.match(/$$([^)]*)$$/g) || []
        for (const part of parts) {
          const extracted = part.match(/$$([^)]*)$$/)?.[1]
          if (extracted) textMatches.push(extracted)
        }
      }
    }

    // Method 2: Plain text sequences
    const plainTextRegex = /[A-Za-z][A-Za-z0-9\s.,;:!?'"()-]{20,}/g
    const plainMatches = text.match(plainTextRegex) || []

    // Method 3: Stream content
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g
    let streamMatch
    while ((streamMatch = streamRegex.exec(text)) !== null) {
      const streamContent = streamMatch[1]
      const readable = streamContent.match(/[A-Za-z\s]{10,}/g) || []
      textMatches.push(...readable)
    }

    // Count pages
    const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) || []).length

    const allText = [...new Set([...textMatches, ...plainMatches])].join(" ")
    const cleanedText = cleanExtractedText(allText)

    if (cleanedText.length > 100) {
      return {
        text: cleanedText,
        method: "pdf-binary-parse",
        confidence: 0.7,
        pageCount,
      }
    }

    return {
      text: "PDF uploaded. Complex formatting detected - some content may not be extracted. Consider using OCR for scanned documents.",
      method: "pdf-limited",
      confidence: 0.3,
      pageCount,
    }
  } catch (error) {
    return {
      text: "PDF processing encountered an issue.",
      method: "pdf-error",
      confidence: 0,
    }
  }
}

async function extractTextFromDOCX(arrayBuffer: ArrayBuffer): Promise<{
  text: string
  structure: object | null
  confidence: number
  paragraphCount: number
}> {
  try {
    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(arrayBuffer)

    const documentXml = await zip.file("word/document.xml")?.async("string")
    if (!documentXml) {
      return {
        text: "DOCX file uploaded but no document.xml found.",
        structure: null,
        confidence: 0,
        paragraphCount: 0,
      }
    }

    const paragraphs: string[] = []
    const headings: { level: number; text: string }[] = []
    const tables: string[][] = []

    // Extract paragraphs
    const parts = documentXml.split(/<w:p[^>]*>/)
    for (const part of parts) {
      const texts = part.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
      const paragraphText = texts.map((t) => t.replace(/<[^>]+>/g, "")).join("")

      if (paragraphText.trim()) {
        // Check if it's a heading
        const styleMatch = part.match(/<w:pStyle\s+w:val="([^"]+)"/)
        if (styleMatch && styleMatch[1].toLowerCase().includes("heading")) {
          const level = Number.parseInt(styleMatch[1].replace(/\D/g, "")) || 1
          headings.push({ level, text: paragraphText })
        }
        paragraphs.push(paragraphText)
      }
    }

    // Extract tables
    const tableMatches = documentXml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || []
    for (const tableXml of tableMatches) {
      const rows: string[] = []
      const rowMatches = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || []
      for (const rowXml of rowMatches) {
        const cells: string[] = []
        const cellMatches = rowXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || []
        for (const cellXml of cellMatches) {
          const cellTexts = cellXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
          cells.push(cellTexts.map((t) => t.replace(/<[^>]+>/g, "")).join(""))
        }
        rows.push(cells.join(" | "))
      }
      tables.push(rows)
    }

    const text = paragraphs.join("\n\n")

    return {
      text: text || "Document processed successfully.",
      structure: { headings, tableCount: tables.length },
      confidence: 0.9,
      paragraphCount: paragraphs.length,
    }
  } catch (error) {
    return { text: "DOCX extraction encountered an issue.", structure: null, confidence: 0, paragraphCount: 0 }
  }
}

async function extractTextFromXLSX(arrayBuffer: ArrayBuffer): Promise<{
  text: string
  structure: object | null
  confidence: number
  sheetCount: number
  totalRows: number
}> {
  try {
    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Get shared strings
    const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string")
    const sharedStrings: string[] = []
    if (sharedStringsXml) {
      const stringMatches = sharedStringsXml.match(/<t[^>]*>([^<]*)<\/t>/g) || []
      for (const match of stringMatches) {
        sharedStrings.push(match.replace(/<[^>]+>/g, ""))
      }
    }

    // Get sheet names
    const workbookXml = await zip.file("xl/workbook.xml")?.async("string")
    const sheetNames: string[] = []
    if (workbookXml) {
      const sheetMatches = workbookXml.match(/<sheet[^>]+name="([^"]+)"/g) || []
      for (const match of sheetMatches) {
        const name = match.match(/name="([^"]+)"/)?.[1]
        if (name) sheetNames.push(name)
      }
    }

    const sheets: { name: string; data: string[][] }[] = []
    let totalRows = 0

    const sheetFiles = Object.keys(zip.files)
      .filter((name) => name.match(/xl\/worksheets\/sheet\d+\.xml$/))
      .sort()

    for (let i = 0; i < sheetFiles.length; i++) {
      const sheetFile = sheetFiles[i]
      const sheetXml = await zip.file(sheetFile)?.async("string")
      if (!sheetXml) continue

      const sheetName = sheetNames[i] || `Sheet ${i + 1}`
      const rows: string[][] = []
      const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []

      for (const row of rowMatches.slice(0, 500)) {
        // Limit rows
        const cellValues: string[] = []
        const cellMatches = row.match(/<c[^>]*>[\s\S]*?<\/c>/g) || []

        for (const cell of cellMatches) {
          const isSharedString = cell.includes('t="s"')
          const valueMatch = cell.match(/<v>([^<]*)<\/v>/)

          if (valueMatch) {
            if (isSharedString) {
              const index = Number.parseInt(valueMatch[1])
              cellValues.push(sharedStrings[index] || valueMatch[1])
            } else {
              cellValues.push(valueMatch[1])
            }
          } else {
            cellValues.push("")
          }
        }

        if (cellValues.some((v) => v.trim())) {
          rows.push(cellValues)
          totalRows++
        }
      }

      if (rows.length > 0) {
        sheets.push({ name: sheetName, data: rows })
      }
    }

    // Format output
    const textParts: string[] = []
    for (const sheet of sheets) {
      textParts.push(`=== ${sheet.name} ===`)
      for (const row of sheet.data) {
        textParts.push(row.join(" | "))
      }
      textParts.push("")
    }

    return {
      text: textParts.join("\n") || "Spreadsheet processed successfully.",
      structure: { sheets: sheets.map((s) => ({ name: s.name, rowCount: s.data.length })) },
      confidence: 0.9,
      sheetCount: sheets.length,
      totalRows,
    }
  } catch (error) {
    return {
      text: "XLSX extraction encountered an issue.",
      structure: null,
      confidence: 0,
      sheetCount: 0,
      totalRows: 0,
    }
  }
}

async function extractTextFromImage(
  arrayBuffer: ArrayBuffer,
  mimeType: string,
): Promise<{
  text: string
  method: string
  confidence: number
  width?: number
  height?: number
}> {
  if (!process.env.XAI_API_KEY) {
    return {
      text: "Image uploaded. OCR requires AI API key to extract text from images.",
      method: "ocr-unavailable",
      confidence: 0,
    }
  }

  try {
    // Convert to base64 for AI vision
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const dataUrl = `data:${mimeType};base64,${base64}`

    const result = await generateText({
      model: xai("grok-4"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL text from this image. Include every word, number, and symbol you can see. Preserve the original formatting and structure as much as possible. If this is a scanned document, extract the full document text. Output ONLY the extracted text, nothing else.",
            },
            {
              type: "image",
              image: dataUrl,
            },
          ],
        },
      ],
      maxTokens: 4000,
    })

    const extractedText = result.text.trim()

    return {
      text: extractedText || "No text could be extracted from this image.",
      method: "ai-vision-ocr",
      confidence: extractedText.length > 50 ? 0.85 : 0.5,
    }
  } catch (error) {
    return {
      text: "Image OCR processing failed.",
      method: "ocr-error",
      confidence: 0,
    }
  }
}

async function enhanceExtractedContent(
  content: string,
  fileName: string,
): Promise<{
  text: string
  improved: boolean
}> {
  try {
    const result = await generateText({
      model: xai("grok-4"),
      prompt: `The following text was extracted from a file named "${fileName}" but may have formatting issues or garbled characters. Clean it up and make it readable while preserving the original meaning. If the text looks fine, return it as-is. Only output the cleaned text, nothing else.

Extracted text:
${content.slice(0, 3000)}`,
      maxTokens: 4000,
    })

    const enhanced = result.text.trim()
    const improved = enhanced !== content.slice(0, 3000) && enhanced.length > content.length * 0.5

    return { text: improved ? enhanced : content, improved }
  } catch {
    return { text: content, improved: false }
  }
}

function generateDocumentStats(content: string): {
  wordCount: number
  sentenceCount: number
  paragraphCount: number
  avgWordsPerSentence: number
  readingTimeMinutes: number
  uniqueWords: number
} {
  const words = content.split(/\s+/).filter(Boolean)
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))).size

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
    readingTimeMinutes: Math.ceil(words.length / 200), // ~200 wpm average
    uniqueWords,
  }
}

function detectLanguage(content: string): string {
  const sample = content.slice(0, 1000).toLowerCase()

  // Simple heuristic based on common words
  const patterns: Record<string, RegExp[]> = {
    english: [/\bthe\b/, /\band\b/, /\bis\b/, /\bof\b/, /\bto\b/],
    spanish: [/\bel\b/, /\bla\b/, /\bde\b/, /\by\b/, /\bque\b/],
    french: [/\ble\b/, /\bla\b/, /\bde\b/, /\bet\b/, /\best\b/],
    german: [/\bder\b/, /\bdie\b/, /\bund\b/, /\bist\b/, /\bein\b/],
  }

  let bestMatch = "english"
  let bestScore = 0

  for (const [lang, regexes] of Object.entries(patterns)) {
    const score = regexes.filter((r) => r.test(sample)).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = lang
    }
  }

  return bestMatch
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\n\u00C0-\u024F]/g, " ")
    .trim()
}
