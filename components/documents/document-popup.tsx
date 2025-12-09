"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Edit3,
  Upload,
  ImageIcon,
  FileJson,
  FileCode,
  Clock,
  BarChart3,
  Languages,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useHRStore, type Document } from "@/lib/store"
import { PPTXViewer } from "./pptx-viewer"
import { DocumentEditorModal } from "./document-editor-modal"
import { RichDocumentPreview } from "./rich-document-preview"
import { FloatingPopup } from "@/components/ui/floating-popup"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

const fileTypeConfig: Record<
  string,
  { icon: typeof FileText; color: string; bg: string; label: string; gradient: string }
> = {
  pdf: { icon: FileText, color: "text-red-500", bg: "bg-red-100", label: "PDF", gradient: "from-red-500 to-rose-500" },
  docx: {
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-100",
    label: "DOCX",
    gradient: "from-blue-500 to-indigo-500",
  },
  doc: {
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "DOC",
    gradient: "from-blue-600 to-indigo-600",
  },
  xlsx: {
    icon: FileSpreadsheet,
    color: "text-green-500",
    bg: "bg-green-100",
    label: "XLSX",
    gradient: "from-green-500 to-emerald-500",
  },
  xls: {
    icon: FileSpreadsheet,
    color: "text-green-600",
    bg: "bg-green-100",
    label: "XLS",
    gradient: "from-green-600 to-emerald-600",
  },
  pptx: {
    icon: Presentation,
    color: "text-orange-500",
    bg: "bg-orange-100",
    label: "PPTX",
    gradient: "from-orange-500 to-amber-500",
  },
  ppt: {
    icon: Presentation,
    color: "text-orange-600",
    bg: "bg-orange-100",
    label: "PPT",
    gradient: "from-orange-600 to-amber-600",
  },
  csv: {
    icon: FileSpreadsheet,
    color: "text-emerald-500",
    bg: "bg-emerald-100",
    label: "CSV",
    gradient: "from-emerald-500 to-teal-500",
  },
  txt: {
    icon: FileText,
    color: "text-slate-500",
    bg: "bg-slate-100",
    label: "TXT",
    gradient: "from-slate-500 to-gray-500",
  },
  md: {
    icon: FileCode,
    color: "text-purple-500",
    bg: "bg-purple-100",
    label: "MD",
    gradient: "from-purple-500 to-violet-500",
  },
  json: {
    icon: FileJson,
    color: "text-yellow-500",
    bg: "bg-yellow-100",
    label: "JSON",
    gradient: "from-yellow-500 to-amber-500",
  },
  xml: {
    icon: FileCode,
    color: "text-cyan-500",
    bg: "bg-cyan-100",
    label: "XML",
    gradient: "from-cyan-500 to-sky-500",
  },
  html: {
    icon: FileCode,
    color: "text-pink-500",
    bg: "bg-pink-100",
    label: "HTML",
    gradient: "from-pink-500 to-rose-500",
  },
  jpg: {
    icon: ImageIcon,
    color: "text-violet-500",
    bg: "bg-violet-100",
    label: "JPG",
    gradient: "from-violet-500 to-purple-500",
  },
  jpeg: {
    icon: ImageIcon,
    color: "text-violet-500",
    bg: "bg-violet-100",
    label: "JPEG",
    gradient: "from-violet-500 to-purple-500",
  },
  png: {
    icon: ImageIcon,
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-100",
    label: "PNG",
    gradient: "from-fuchsia-500 to-pink-500",
  },
  tiff: {
    icon: ImageIcon,
    color: "text-indigo-500",
    bg: "bg-indigo-100",
    label: "TIFF",
    gradient: "from-indigo-500 to-blue-500",
  },
  webp: {
    icon: ImageIcon,
    color: "text-teal-500",
    bg: "bg-teal-100",
    label: "WEBP",
    gradient: "from-teal-500 to-cyan-500",
  },
}

function getNormalizedFileType(fileName: string, mimeType?: string): string {
  const ext = fileName.toLowerCase().split(".").pop() || ""
  if (fileTypeConfig[ext]) return ext
  if (mimeType?.includes("pdf")) return "pdf"
  if (mimeType?.includes("wordprocessingml") || mimeType?.includes("docx")) return "docx"
  if (mimeType?.includes("spreadsheetml") || mimeType?.includes("xlsx")) return "xlsx"
  if (mimeType?.includes("presentationml") || mimeType?.includes("pptx")) return "pptx"
  if (mimeType?.includes("csv")) return "csv"
  if (mimeType?.includes("text/plain")) return "txt"
  if (mimeType?.includes("image/jpeg")) return "jpg"
  if (mimeType?.includes("image/png")) return "png"
  return "unknown"
}

const MAX_FILE_SIZE = 50 * 1024 * 1024
const validExtensions = [
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".pptx",
  ".ppt",
  ".csv",
  ".txt",
  ".md",
  ".json",
  ".xml",
  ".html",
  ".jpg",
  ".jpeg",
  ".png",
  ".tiff",
  ".webp",
]

interface ProcessingStage {
  id: string
  label: string
  status: "pending" | "active" | "complete" | "error"
  detail?: string
}

interface DocumentPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function DocumentPopup({ isOpen, onClose }: DocumentPopupProps) {
  const {
    documents,
    addDocument,
    updateDocument,
    removeDocument,
    addTask,
    updateTask,
    addAIActivity,
    updateAIActivity,
    removeAIActivity,
  } = useHRStore()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<Map<string, { progress: number; stages: ProcessingStage[] }>>(
    new Map(),
  )
  const [pptxViewerDoc, setPptxViewerDoc] = useState<Document | null>(null)
  const [editorDoc, setEditorDoc] = useState<Document | null>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  const processFile = async (file: File) => {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const normalizedType = getNormalizedFileType(file.name, file.type)
    const activityId = Date.now()

    // Initialize processing stages
    const stages: ProcessingStage[] = [
      { id: "upload", label: "Uploading file", status: "pending" },
      { id: "parse", label: "Parsing content", status: "pending" },
      { id: "extract", label: "Extracting text", status: "pending" },
      { id: "analyze", label: "Analyzing structure", status: "pending" },
      { id: "enhance", label: "AI enhancement", status: "pending" },
      { id: "finalize", label: "Finalizing", status: "pending" },
    ]

    setProcessingFiles((prev) => new Map(prev).set(docId, { progress: 0, stages }))

    const updateStage = (stageId: string, status: ProcessingStage["status"], detail?: string) => {
      setProcessingFiles((prev) => {
        const current = prev.get(docId)
        if (!current) return prev
        const newStages = current.stages.map((s) => (s.id === stageId ? { ...s, status, detail } : s))
        const completedCount = newStages.filter((s) => s.status === "complete").length
        const progress = Math.round((completedCount / newStages.length) * 100)
        return new Map(prev).set(docId, { progress, stages: newStages })
      })
    }

    const newDoc: Document = {
      id: docId,
      name: file.name,
      type: normalizedType,
      content: "",
      status: "uploading",
    }

    addDocument(newDoc)
    addAIActivity({
      id: activityId,
      type: "analysis",
      title: `Processing ${file.name}`,
      description: "Uploading file...",
      status: "in-progress",
      progress: 0,
      startedAt: new Date(),
    })

    const taskId = `task-${Date.now()}`
    addTask({
      id: taskId,
      title: `Processing ${file.name}`,
      status: "in-progress",
      type: "document",
      progress: 0,
    })

    try {
      // Stage 1: Upload
      updateStage("upload", "active", "Preparing file...")
      updateDocument(docId, { status: "uploading" })
      updateAIActivity(activityId, { description: "Uploading file...", progress: 10 })

      const formData = new FormData()
      formData.append("file", file)

      updateStage("upload", "complete", `${(file.size / 1024).toFixed(1)} KB`)

      // Stage 2: Parse
      updateStage("parse", "active", "Sending to parser...")
      updateDocument(docId, { status: "parsing" })
      updateAIActivity(activityId, { description: "Parsing document structure...", progress: 25 })
      updateTask(taskId, { progress: 25 })

      const response = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      })

      updateStage("parse", "complete")

      // Stage 3: Extract
      updateStage("extract", "active", "Processing content...")
      updateAIActivity(activityId, { description: "Extracting text content...", progress: 45 })
      updateTask(taskId, { progress: 45 })

      let data
      const responseText = await response.text()

      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(`Server returned invalid response: ${responseText.slice(0, 100)}`)
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse document")
      }

      updateStage("extract", "complete", `${data.wordCount?.toLocaleString() || 0} words`)

      // Stage 4: Analyze
      updateStage("analyze", "active", "Analyzing document structure...")
      updateAIActivity(activityId, { description: "Analyzing document structure...", progress: 65 })
      updateTask(taskId, { progress: 65 })

      // Simulate brief analysis time
      await new Promise((r) => setTimeout(r, 300))
      updateStage("analyze", "complete", data.metadata?.category || "document")

      // Stage 5: AI Enhancement
      if (data.metadata?.aiEnhanced) {
        updateStage("enhance", "active", "Improving extraction quality...")
        updateAIActivity(activityId, { description: "AI enhancing content...", progress: 80 })
        await new Promise((r) => setTimeout(r, 200))
        updateStage("enhance", "complete", "Content improved")
      } else {
        updateStage("enhance", "complete", "Not needed")
      }

      // Stage 6: Finalize
      updateStage("finalize", "active", "Saving document...")
      updateAIActivity(activityId, { description: "Finalizing...", progress: 95 })
      updateTask(taskId, { progress: 95 })

      updateDocument(docId, {
        content: data.content || "",
        preview: data.preview || "",
        structuredData: data.structuredData || null,
        metadata: {
          ...data.metadata,
          stats: data.stats,
        },
        characterCount: data.characterCount || 0,
        wordCount: data.wordCount || 0,
        status: "ready",
      })

      updateStage("finalize", "complete")
      updateAIActivity(activityId, {
        description: "Document processed successfully",
        progress: 100,
        status: "complete",
      })
      updateTask(taskId, { status: "complete", progress: 100 })

      // Clear processing state after a delay
      setTimeout(() => {
        setProcessingFiles((prev) => {
          const newMap = new Map(prev)
          newMap.delete(docId)
          return newMap
        })
        removeAIActivity(activityId)
      }, 2000)

      toast({
        title: "Document processed",
        description: `${file.name} - ${data.wordCount?.toLocaleString() || 0} words extracted`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Mark current stage as error
      setProcessingFiles((prev) => {
        const current = prev.get(docId)
        if (!current) return prev
        const newStages = current.stages.map((s) =>
          s.status === "active" ? { ...s, status: "error" as const, detail: errorMessage } : s,
        )
        return new Map(prev).set(docId, { ...current, stages: newStages })
      })

      updateDocument(docId, { status: "error", error: errorMessage })
      updateAIActivity(activityId, {
        description: `Error: ${errorMessage}`,
        status: "error",
      })
      updateTask(taskId, { status: "error" })

      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive",
      })

      // Clear after delay
      setTimeout(() => {
        setProcessingFiles((prev) => {
          const newMap = new Map(prev)
          newMap.delete(docId)
          return newMap
        })
        removeAIActivity(activityId)
      }, 5000)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => {
        const ext = `.${file.name.toLowerCase().split(".").pop()}`
        return validExtensions.includes(ext)
      })

      const invalidFiles = acceptedFiles.filter((file) => {
        const ext = `.${file.name.toLowerCase().split(".").pop()}`
        return !validExtensions.includes(ext)
      })

      if (invalidFiles.length > 0) {
        toast({
          title: "Invalid file type",
          description: `Unsupported: ${invalidFiles.map((f) => f.name).join(", ")}`,
          variant: "destructive",
        })
      }

      const oversizedFiles = validFiles.filter((file) => file.size > MAX_FILE_SIZE)
      const sizedFiles = validFiles.filter((file) => file.size <= MAX_FILE_SIZE)

      if (oversizedFiles.length > 0) {
        toast({
          title: "File too large",
          description: `Maximum file size is 50MB.`,
          variant: "destructive",
        })
      }

      if (sizedFiles.length === 0) return

      setIsProcessing(true)

      // Process files in parallel (up to 3 at a time)
      const chunks = []
      for (let i = 0; i < sizedFiles.length; i += 3) {
        chunks.push(sizedFiles.slice(i, i + 3))
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map((file) => processFile(file)))
      }

      setIsProcessing(false)
    },
    [addDocument, updateDocument, addTask, updateTask, toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  const handleViewDocument = (doc: Document) => {
    if (doc.type === "pptx" || doc.type === "ppt") {
      setPptxViewerDoc(doc)
    } else {
      setPreviewDoc(doc)
    }
  }

  const handleEditDocument = (doc: Document) => {
    setEditorDoc(doc)
  }

  const handleExport = async (doc: Document, format: string) => {
    try {
      const response = await fetch("/api/export-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: doc.content,
          fileName: doc.name,
          format,
        }),
      })

      if (!response.ok) throw new Error("Export failed")

      const data = await response.json()

      if (!data.success || !data.file) {
        throw new Error("Invalid export response")
      }

      const binaryString = atob(data.file)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: data.mimeType })

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.fileName || `${doc.name.split(".")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export successful",
        description: `Document exported as ${format.toUpperCase()}`,
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const getFileConfig = (doc: Document) => {
    return fileTypeConfig[doc.type] || fileTypeConfig.txt
  }

  return (
    <>
      <FloatingPopup
        isOpen={isOpen}
        onClose={onClose}
        title="Document Upload"
        subtitle="AI-powered document processing with OCR"
        icon={<Upload className="w-5 h-5" />}
        defaultSize="large"
      >
        <div className="p-4 md:p-6 space-y-6">
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={cn(
              "relative p-6 md:p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
              isDragActive
                ? "border-blue-400 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 scale-[1.01]"
                : "border-slate-200 bg-gradient-to-br from-slate-50/50 to-white/50 hover:border-slate-300 hover:from-slate-50/80 hover:to-white/80",
            )}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center justify-center py-4">
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all",
                  isDragActive
                    ? "bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30"
                    : "bg-gradient-to-br from-slate-100 to-slate-200",
                )}
              >
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Upload className={cn("w-8 h-8", isDragActive ? "text-white" : "text-slate-400")} />
                )}
              </div>

              <p className="text-lg font-semibold text-slate-700 mb-1">
                {isDragActive ? "Drop files here" : "Drag & drop or click to browse"}
              </p>
              <p className="text-sm text-slate-500 mb-4">Documents, spreadsheets, presentations, and images</p>

              <div className="flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                  <Zap className="w-3 h-3" />
                  AI-Powered
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  <ImageIcon className="w-3 h-3" />
                  OCR Support
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                  <Languages className="w-3 h-3" />
                  Multi-language
                </span>
              </div>
            </div>

            {/* File Type Icons */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {Object.entries(fileTypeConfig)
                .slice(0, 10)
                .map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <div
                      key={key}
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center",
                        config.bg,
                        "opacity-60 hover:opacity-100 transition-all hover:scale-110",
                      )}
                      title={config.label}
                    >
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>
                  )
                })}
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100 opacity-60">
                <span className="text-xs text-slate-500 font-medium">+{Object.keys(fileTypeConfig).length - 10}</span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {processingFiles.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  Processing ({processingFiles.size} file{processingFiles.size > 1 ? "s" : ""})
                </h3>

                {Array.from(processingFiles.entries()).map(([docId, { progress, stages }]) => {
                  const doc = documents.find((d) => d.id === docId)
                  if (!doc) return null

                  const config = getFileConfig(doc)
                  const Icon = config.icon
                  const activeStage = stages.find((s) => s.status === "active")

                  return (
                    <motion.div
                      key={docId}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br",
                            config.gradient,
                          )}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate text-sm">{doc.name}</p>
                          <p className="text-xs text-blue-600">
                            {activeStage?.label || "Processing..."} {activeStage?.detail && `- ${activeStage.detail}`}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-blue-600">{progress}%</span>
                      </div>

                      <Progress value={progress} className="h-2 mb-3" />

                      {/* Stage indicators */}
                      <div className="flex gap-1">
                        {stages.map((stage) => (
                          <div
                            key={stage.id}
                            className={cn(
                              "flex-1 h-1.5 rounded-full transition-all",
                              stage.status === "complete" && "bg-green-500",
                              stage.status === "active" && "bg-blue-500 animate-pulse",
                              stage.status === "pending" && "bg-slate-200",
                              stage.status === "error" && "bg-red-500",
                            )}
                            title={`${stage.label}: ${stage.status}`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Document List */}
          <AnimatePresence>
            {documents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-medium text-slate-700">Uploaded Documents ({documents.length})</h3>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-thin pr-1">
                  {documents.map((doc) => {
                    const config = getFileConfig(doc)
                    const Icon = config.icon
                    const isProcessing = processingFiles.has(doc.id)

                    if (isProcessing) return null // Show in processing section instead

                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={cn(
                          "p-3 md:p-4 rounded-xl",
                          "bg-white border border-slate-200/50",
                          "hover:shadow-md hover:border-slate-300 transition-all duration-200",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br",
                              config.gradient,
                            )}
                          >
                            <Icon className="w-5 h-5 text-white" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate text-sm">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                {config.label}
                              </span>
                              {doc.wordCount && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <BarChart3 className="w-3 h-3" />
                                  {doc.wordCount.toLocaleString()} words
                                </span>
                              )}
                              {doc.metadata?.stats?.readingTimeMinutes && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {doc.metadata.stats.readingTimeMinutes} min read
                                </span>
                              )}
                              {doc.metadata?.language && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Languages className="w-3 h-3" />
                                  {doc.metadata.language}
                                </span>
                              )}
                              {doc.metadata?.aiEnhanced && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  AI Enhanced
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {doc.status === "ready" && (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewDocument(doc)}
                                  className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditDocument(doc)}
                                  className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleExport(doc, "txt")}
                                  className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {doc.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDocument(doc.id)}
                              className="h-8 w-8 text-slate-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {doc.status === "ready" && doc.preview && (
                          <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-xs text-slate-600 line-clamp-2">{doc.preview}</p>
                          </div>
                        )}

                        {doc.status === "error" && doc.error && (
                          <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-100">
                            <p className="text-xs text-red-600">{doc.error}</p>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </FloatingPopup>

      {/* Sub-modals */}
      <AnimatePresence>
        {pptxViewerDoc && pptxViewerDoc.status === "ready" && (
          <PPTXViewer
            document={pptxViewerDoc}
            onClose={() => setPptxViewerDoc(null)}
            onUpdate={(updatedDoc) => {
              updateDocument(updatedDoc.id, updatedDoc)
              setPptxViewerDoc(updatedDoc)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editorDoc && (
          <DocumentEditorModal
            document={editorDoc}
            onClose={() => setEditorDoc(null)}
            onSave={(content) => {
              updateDocument(editorDoc.id, { content })
              setEditorDoc(null)
              toast({ title: "Document updated", description: "Your changes have been saved." })
            }}
            onExport={(format) => handleExport(editorDoc, format)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewDoc && (
          <RichDocumentPreview
            document={previewDoc}
            onClose={() => setPreviewDoc(null)}
            onEdit={() => {
              setPreviewDoc(null)
              setEditorDoc(previewDoc)
            }}
            onExport={(format) => handleExport(previewDoc, format)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
