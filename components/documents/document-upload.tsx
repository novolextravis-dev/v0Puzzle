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
  ArrowLeft,
  Eye,
  Download,
  Edit3,
  Brain,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Tags,
  Target,
  FileQuestion,
  TrendingUp,
  RefreshCw,
  Shield,
  Clock,
  Users,
  Building,
  Calendar,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Lightbulb,
  FileCheck,
  Scale,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useHRStore, type Document, type DocumentAnalysis } from "@/lib/store"
import { PPTXViewer } from "./pptx-viewer"
import { DocumentEditorModal } from "./document-editor-modal"
import { RichDocumentPreview } from "./rich-document-preview"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    gradient: "from-blue-500 to-cyan-500",
  },
  xlsx: {
    icon: FileSpreadsheet,
    color: "text-green-500",
    bg: "bg-green-100",
    label: "XLSX",
    gradient: "from-green-500 to-emerald-500",
  },
  pptx: {
    icon: Presentation,
    color: "text-orange-500",
    bg: "bg-orange-100",
    label: "PPTX",
    gradient: "from-orange-500 to-amber-500",
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
}

function getNormalizedFileType(fileName: string, mimeType?: string): string {
  const ext = fileName.toLowerCase().split(".").pop() || ""
  if (["pdf", "docx", "xlsx", "pptx", "csv", "txt"].includes(ext)) {
    return ext
  }
  if (mimeType?.includes("pdf")) return "pdf"
  if (mimeType?.includes("wordprocessingml") || mimeType?.includes("docx")) return "docx"
  if (mimeType?.includes("spreadsheetml") || mimeType?.includes("xlsx")) return "xlsx"
  if (mimeType?.includes("presentationml") || mimeType?.includes("pptx")) return "pptx"
  if (mimeType?.includes("csv")) return "csv"
  if (mimeType?.includes("text/plain")) return "txt"
  return "unknown"
}

const MAX_FILE_SIZE = 50 * 1024 * 1024
const validExtensions = [".pdf", ".docx", ".xlsx", ".pptx", ".csv", ".txt"]

interface DocumentUploadProps {
  onBack?: () => void
}

export function DocumentUpload({ onBack }: DocumentUploadProps) {
  const {
    documents,
    addDocument,
    updateDocument,
    removeDocument,
    addTask,
    updateTask,
    aiSettings,
    addAIActivity,
    updateAIActivity,
  } = useHRStore()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [pptxViewerDoc, setPptxViewerDoc] = useState<Document | null>(null)
  const [editorDoc, setEditorDoc] = useState<Document | null>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [expandedAnalysis, setExpandedAnalysis] = useState<Set<string>>(new Set())
  const [selectedAnalysisDoc, setSelectedAnalysisDoc] = useState<Document | null>(null)
  const [reanalyzing, setReanalyzing] = useState<Set<string>>(new Set())

  const analyzeDocument = async (docId: string, content: string, fileName: string, isReanalyze = false) => {
    const activityId = `analyze-${docId}-${Date.now()}`

    if (isReanalyze) {
      setReanalyzing((prev) => new Set(prev).add(docId))
    }

    addAIActivity({
      id: activityId,
      type: "analysis",
      title: `${isReanalyze ? "Re-analyzing" : "Analyzing"} ${fileName}`,
      description: "Initializing deep analysis...",
      status: "running",
      progress: 5,
      startedAt: Date.now(),
    })

    updateDocument(docId, { status: "analyzing" })

    try {
      updateAIActivity(activityId, { progress: 15, description: "Scanning document structure..." })
      await new Promise((r) => setTimeout(r, 300))

      updateAIActivity(activityId, { progress: 25, description: "Extracting entities and metadata..." })
      await new Promise((r) => setTimeout(r, 300))

      // Get existing documents for relationship mapping
      const existingDocs = documents
        .filter((d) => d.id !== docId && d.status === "ready" && d.analysis)
        .map((d) => ({
          name: d.name,
          topics: d.analysis?.topics || [],
          category: d.analysis?.categories?.primary || "other",
        }))

      updateAIActivity(activityId, { progress: 35, description: "Running AI analysis with Grok..." })

      const response = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          fileName,
          aiSettings,
          deepAnalysis: true,
          existingDocuments: existingDocs,
        }),
      })

      updateAIActivity(activityId, { progress: 70, description: "Processing insights and recommendations..." })
      await new Promise((r) => setTimeout(r, 200))

      if (!response.ok) throw new Error("Analysis failed")

      const data = await response.json()

      updateAIActivity(activityId, { progress: 85, description: "Mapping relationships..." })
      await new Promise((r) => setTimeout(r, 200))

      updateAIActivity(activityId, { progress: 95, description: "Finalizing analysis report..." })

      if (data.analysis) {
        updateDocument(docId, {
          analysis: data.analysis as DocumentAnalysis,
          status: "ready",
          lastIndexedAt: Date.now(),
        })

        const insightCount = data.analysis.insights?.length || 0
        const riskLevel = data.analysis.riskAssessment?.level || "low"

        updateAIActivity(activityId, {
          status: "completed",
          progress: 100,
          description: `Found ${data.analysis.keyPoints?.length || 0} key points, ${insightCount} insights. Risk: ${riskLevel}`,
          completedAt: Date.now(),
        })

        toast({
          title: "Analysis Complete",
          description: `${fileName} has been fully analyzed with ${data.analysis.topics?.length || 0} topics identified.`,
        })
      } else {
        updateDocument(docId, {
          analysisText: data.analysisText,
          status: "ready",
        })

        updateAIActivity(activityId, {
          status: "completed",
          progress: 100,
          description: "Basic analysis complete",
          completedAt: Date.now(),
        })
      }
    } catch (error) {
      console.error("Analysis error:", error)
      updateDocument(docId, { status: "ready" })
      updateAIActivity(activityId, {
        status: "error",
        description: "Analysis failed - document still available",
      })
      toast({
        title: "Analysis Failed",
        description: "Could not complete analysis. You can try again later.",
        variant: "destructive",
      })
    } finally {
      if (isReanalyze) {
        setReanalyzing((prev) => {
          const next = new Set(prev)
          next.delete(docId)
          return next
        })
      }
    }
  }

  const processFile = async (file: File) => {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const normalizedType = getNormalizedFileType(file.name, file.type)

    const newDoc: Document = {
      id: docId,
      name: file.name,
      type: normalizedType,
      content: "",
      status: "uploading",
      isIndexedForChat: true,
    }

    addDocument(newDoc)

    const taskId = `task-${Date.now()}`
    addTask({
      id: taskId,
      title: `Processing ${file.name}`,
      status: "in-progress",
      type: "document",
      progress: 0,
    })

    try {
      updateDocument(docId, { status: "parsing" })
      updateTask(taskId, { progress: 30 })

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      })

      updateTask(taskId, { progress: 70 })

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

      updateDocument(docId, {
        content: data.content || "",
        preview: data.preview || "",
        structuredData: data.structuredData || null,
        metadata: data.metadata || {},
        characterCount: data.characterCount || 0,
        wordCount: data.wordCount || 0,
        status: "ready",
      })

      updateTask(taskId, { status: "complete", progress: 100 })

      toast({
        title: "Document processed",
        description: `${file.name} has been successfully processed.`,
      })

      // Auto-analyze if content exists
      if (data.content && data.content.length > 100) {
        setTimeout(() => {
          analyzeDocument(docId, data.content, file.name)
        }, 500)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("File processing error:", errorMessage)

      updateDocument(docId, {
        status: "error",
        error: errorMessage,
      })

      updateTask(taskId, { status: "error" })

      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive",
      })
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
          description: `Supported formats: PDF, DOCX, XLSX, PPTX, CSV, TXT`,
          variant: "destructive",
        })
      }

      const oversizedFiles = validFiles.filter((file) => file.size > MAX_FILE_SIZE)
      const sizedFiles = validFiles.filter((file) => file.size <= MAX_FILE_SIZE)

      if (oversizedFiles.length > 0) {
        toast({
          title: "File too large",
          description: `Maximum file size is 50MB. ${oversizedFiles.map((f) => f.name).join(", ")} exceeded the limit.`,
          variant: "destructive",
        })
      }

      if (sizedFiles.length === 0) return

      setIsProcessing(true)

      for (const file of sizedFiles) {
        await processFile(file)
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
    if (doc.type === "pptx") {
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

  const toggleAnalysis = (docId: string) => {
    setExpandedAnalysis((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) {
        next.delete(docId)
      } else {
        next.add(docId)
      }
      return next
    })
  }

  const renderEnhancedAnalysis = (doc: Document) => {
    const analysis = doc.analysis
    if (!analysis) return null

    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="border-t border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50"
      >
        <Tabs defaultValue="overview" className="w-full">
          <div className="px-4 pt-3 border-b border-slate-100">
            <TabsList className="grid grid-cols-5 w-full max-w-lg bg-slate-100/50">
              <TabsTrigger value="overview" className="text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="entities" className="text-xs">
                Entities
              </TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs">
                Compliance
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                Insights
              </TabsTrigger>
              <TabsTrigger value="actions" className="text-xs">
                Actions
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[400px]">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-4 space-y-4 mt-0">
              {/* Summary */}
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-500" />
                  Executive Summary
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{analysis.summary}</p>
              </div>

              {/* Quick Facts */}
              {analysis.quickFacts &&
                Object.keys(analysis.quickFacts).some(
                  (k) => analysis.quickFacts?.[k as keyof typeof analysis.quickFacts],
                ) && (
                  <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Quick Facts
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {analysis.quickFacts.effectiveDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span className="text-slate-600">Effective: {analysis.quickFacts.effectiveDate}</span>
                        </div>
                      )}
                      {analysis.quickFacts.expirationDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-slate-600">Expires: {analysis.quickFacts.expirationDate}</span>
                        </div>
                      )}
                      {analysis.quickFacts.owner && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-emerald-500" />
                          <span className="text-slate-600">Owner: {analysis.quickFacts.owner}</span>
                        </div>
                      )}
                      {analysis.quickFacts.version && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileCheck className="w-4 h-4 text-violet-500" />
                          <span className="text-slate-600">Version: {analysis.quickFacts.version}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Key Points */}
              {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    Key Points ({analysis.keyPoints.length})
                  </h4>
                  <ul className="space-y-2">
                    {analysis.keyPoints.map((point, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2 bg-slate-50 rounded-lg p-2">
                        <span className="text-blue-500 font-bold mt-0.5 min-w-[20px]">{i + 1}.</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Topics & Categories */}
              <div className="flex gap-4">
                {analysis.topics && analysis.topics.length > 0 && (
                  <div className="flex-1 bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <Tags className="w-4 h-4 text-emerald-500" />
                      Topics
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.topics.map((topic, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.categories && (
                  <div className="flex-1 bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-violet-500" />
                      Category
                    </h4>
                    <Badge className="bg-violet-100 text-violet-700 border border-violet-200">
                      {analysis.categories.primary?.replace("-", " ").toUpperCase()}
                    </Badge>
                    {analysis.categories.secondary && analysis.categories.secondary.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {analysis.categories.secondary.map((cat, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-slate-500">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Confidence: {Math.round((analysis.confidenceScore || 0.8) * 100)}%
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full",
                      analysis.sentiment === "positive" && "bg-green-100 text-green-700",
                      analysis.sentiment === "negative" && "bg-red-100 text-red-700",
                      analysis.sentiment === "neutral" && "bg-slate-100 text-slate-600",
                      analysis.sentiment === "mixed" && "bg-amber-100 text-amber-700",
                    )}
                  >
                    {analysis.sentiment || "neutral"} sentiment
                  </span>
                  {analysis.tone && <span className="text-slate-400">Tone: {analysis.tone}</span>}
                </div>
                {analysis.analyzedAt && <span>Analyzed {new Date(analysis.analyzedAt).toLocaleString()}</span>}
              </div>
            </TabsContent>

            {/* Entities Tab */}
            <TabsContent value="entities" className="p-4 space-y-4 mt-0">
              {analysis.entities && (
                <div className="grid grid-cols-2 gap-4">
                  {analysis.entities.people && analysis.entities.people.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        People ({analysis.entities.people.length})
                      </h4>
                      <div className="space-y-1">
                        {analysis.entities.people.map((person, i) => (
                          <div key={i} className="text-sm text-slate-600 bg-blue-50/50 rounded px-2 py-1">
                            {person}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.entities.organizations && analysis.entities.organizations.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <Building className="w-4 h-4 text-violet-500" />
                        Organizations ({analysis.entities.organizations.length})
                      </h4>
                      <div className="space-y-1">
                        {analysis.entities.organizations.map((org, i) => (
                          <div key={i} className="text-sm text-slate-600 bg-violet-50/50 rounded px-2 py-1">
                            {org}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.entities.dates && analysis.entities.dates.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        Dates ({analysis.entities.dates.length})
                      </h4>
                      <div className="space-y-1">
                        {analysis.entities.dates.map((date, i) => (
                          <div key={i} className="text-sm text-slate-600 bg-amber-50/50 rounded px-2 py-1">
                            {date}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.entities.amounts && analysis.entities.amounts.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        Amounts ({analysis.entities.amounts.length})
                      </h4>
                      <div className="space-y-1">
                        {analysis.entities.amounts.map((amount, i) => (
                          <div key={i} className="text-sm text-slate-600 bg-emerald-50/50 rounded px-2 py-1">
                            {amount}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.entities.jobTitles && analysis.entities.jobTitles.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-rose-500" />
                        Job Titles ({analysis.entities.jobTitles.length})
                      </h4>
                      <div className="space-y-1">
                        {analysis.entities.jobTitles.map((title, i) => (
                          <div key={i} className="text-sm text-slate-600 bg-rose-50/50 rounded px-2 py-1">
                            {title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.entities.policies && analysis.entities.policies.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-500" />
                        Referenced Policies ({analysis.entities.policies.length})
                      </h4>
                      <div className="space-y-1">
                        {analysis.entities.policies.map((policy, i) => (
                          <div key={i} className="text-sm text-slate-600 bg-cyan-50/50 rounded px-2 py-1">
                            {policy}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(!analysis.entities || Object.values(analysis.entities).every((arr) => !arr || arr.length === 0)) && (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No entities extracted from this document</p>
                </div>
              )}
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="p-4 space-y-4 mt-0">
              {/* Risk Assessment */}
              {analysis.riskAssessment && (
                <div
                  className={cn(
                    "rounded-xl p-4 border",
                    analysis.riskAssessment.level === "critical" && "bg-red-50 border-red-200",
                    analysis.riskAssessment.level === "high" && "bg-orange-50 border-orange-200",
                    analysis.riskAssessment.level === "medium" && "bg-amber-50 border-amber-200",
                    analysis.riskAssessment.level === "low" && "bg-green-50 border-green-200",
                  )}
                >
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle
                      className={cn(
                        "w-4 h-4",
                        analysis.riskAssessment.level === "critical" && "text-red-500",
                        analysis.riskAssessment.level === "high" && "text-orange-500",
                        analysis.riskAssessment.level === "medium" && "text-amber-500",
                        analysis.riskAssessment.level === "low" && "text-green-500",
                      )}
                    />
                    Risk Assessment: <span className="uppercase">{analysis.riskAssessment.level}</span>
                  </h4>

                  {analysis.riskAssessment.factors && analysis.riskAssessment.factors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Risk Factors:</p>
                      <ul className="space-y-1">
                        {analysis.riskAssessment.factors.map((factor, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                            <span className="text-red-400">•</span> {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.riskAssessment.mitigations && analysis.riskAssessment.mitigations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Suggested Mitigations:</p>
                      <ul className="space-y-1">
                        {analysis.riskAssessment.mitigations.map((mit, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                            <span className="text-green-500">✓</span> {mit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Compliance Analysis */}
              {analysis.complianceAnalysis && (
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-500" />
                    Compliance Status:
                    <Badge
                      className={cn(
                        analysis.complianceAnalysis.status === "compliant" && "bg-green-100 text-green-700",
                        analysis.complianceAnalysis.status === "needs-review" && "bg-amber-100 text-amber-700",
                        analysis.complianceAnalysis.status === "non-compliant" && "bg-red-100 text-red-700",
                        analysis.complianceAnalysis.status === "not-applicable" && "bg-slate-100 text-slate-600",
                      )}
                    >
                      {analysis.complianceAnalysis.status?.replace("-", " ").toUpperCase()}
                    </Badge>
                  </h4>

                  {analysis.complianceAnalysis.regulations && analysis.complianceAnalysis.regulations.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-600 mb-2">Relevant Regulations:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.complianceAnalysis.regulations.map((reg, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {reg}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.complianceAnalysis.concerns && analysis.complianceAnalysis.concerns.length > 0 && (
                    <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-xs font-medium text-amber-700 mb-1">Concerns:</p>
                      <ul className="space-y-1">
                        {analysis.complianceAnalysis.concerns.map((concern, i) => (
                          <li key={i} className="text-sm text-amber-800">
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.complianceAnalysis.recommendations &&
                    analysis.complianceAnalysis.recommendations.length > 0 && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-xs font-medium text-green-700 mb-1">Recommendations:</p>
                        <ul className="space-y-1">
                          {analysis.complianceAnalysis.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-green-800">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {/* Document Metadata */}
              {analysis.documentMetadata && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Document Classification</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Type:</span>
                      <span className="ml-2 font-medium text-slate-700">{analysis.documentMetadata.documentType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Urgency:</span>
                      <Badge
                        className={cn(
                          "ml-2",
                          analysis.documentMetadata.urgency === "critical" && "bg-red-100 text-red-700",
                          analysis.documentMetadata.urgency === "urgent" && "bg-orange-100 text-orange-700",
                          analysis.documentMetadata.urgency === "time-sensitive" && "bg-amber-100 text-amber-700",
                          analysis.documentMetadata.urgency === "routine" && "bg-slate-100 text-slate-600",
                        )}
                      >
                        {analysis.documentMetadata.urgency}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-slate-500">Access Level:</span>
                      <span className="ml-2 font-medium text-slate-700">{analysis.documentMetadata.accessLevel}</span>
                    </div>
                    {analysis.documentMetadata.retentionPeriod && (
                      <div>
                        <span className="text-slate-500">Retention:</span>
                        <span className="ml-2 font-medium text-slate-700">
                          {analysis.documentMetadata.retentionPeriod}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="p-4 space-y-4 mt-0">
              {analysis.insights && analysis.insights.length > 0 ? (
                <div className="space-y-3">
                  {analysis.insights.map((insight, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl p-4 border",
                        insight.type === "warning" && "bg-red-50 border-red-200",
                        insight.type === "recommendation" && "bg-blue-50 border-blue-200",
                        insight.type === "opportunity" && "bg-emerald-50 border-emerald-200",
                        insight.type === "observation" && "bg-slate-50 border-slate-200",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            insight.type === "warning" && "bg-red-100",
                            insight.type === "recommendation" && "bg-blue-100",
                            insight.type === "opportunity" && "bg-emerald-100",
                            insight.type === "observation" && "bg-slate-100",
                          )}
                        >
                          {insight.type === "warning" && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          {insight.type === "recommendation" && <Lightbulb className="w-4 h-4 text-blue-600" />}
                          {insight.type === "opportunity" && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                          {insight.type === "observation" && <Eye className="w-4 h-4 text-slate-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-slate-800">{insight.title}</h5>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                insight.impact === "high" && "border-red-300 text-red-600",
                                insight.impact === "medium" && "border-amber-300 text-amber-600",
                                insight.impact === "low" && "border-slate-300 text-slate-500",
                              )}
                            >
                              {insight.impact} impact
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No specific insights generated for this document</p>
                </div>
              )}

              {/* Suggested Questions */}
              {analysis.suggestedQuestions && analysis.suggestedQuestions.length > 0 && (
                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                  <h4 className="text-sm font-semibold text-violet-800 mb-3 flex items-center gap-2">
                    <FileQuestion className="w-4 h-4" />
                    Questions to Ask
                  </h4>
                  <div className="space-y-2">
                    {analysis.suggestedQuestions.map((q, i) => (
                      <p
                        key={i}
                        className="text-sm text-violet-700 bg-white/60 rounded-lg px-3 py-2 border border-violet-100"
                      >
                        "{q}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="p-4 space-y-4 mt-0">
              {analysis.actionItems && analysis.actionItems.length > 0 ? (
                <div className="space-y-3">
                  {analysis.actionItems.map((item, i) => {
                    const action =
                      typeof item === "string" ? { task: item, priority: "medium", assignee: "HR Team" } : item
                    return (
                      <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                              action.priority === "high" && "bg-red-100 text-red-600",
                              action.priority === "medium" && "bg-amber-100 text-amber-600",
                              action.priority === "low" && "bg-green-100 text-green-600",
                            )}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{action.task}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {action.assignee || "HR Team"}
                              </span>
                              {action.deadline && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {action.deadline}
                                </span>
                              )}
                              <Badge
                                className={cn(
                                  "text-xs",
                                  action.priority === "high" && "bg-red-100 text-red-600",
                                  action.priority === "medium" && "bg-amber-100 text-amber-600",
                                  action.priority === "low" && "bg-green-100 text-green-600",
                                )}
                              >
                                {action.priority} priority
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No action items identified</p>
                </div>
              )}

              {/* Related Documents */}
              {analysis.relatedDocuments && analysis.relatedDocuments.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Related Documents
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.relatedDocuments.map((docName, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-white">
                        {docName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Document Upload</h2>
          <p className="text-sm text-slate-500">Upload HR documents for AI-powered analysis and Q&A</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative p-8 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragActive
            ? "border-blue-400 bg-blue-50/50 scale-[1.02]"
            : "border-slate-200 bg-white/50 hover:border-slate-300 hover:bg-white/80",
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center py-8">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
              isDragActive ? "bg-blue-100" : "bg-slate-100",
            )}
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            ) : (
              <FileText className={cn("w-8 h-8", isDragActive ? "text-blue-500" : "text-slate-400")} />
            )}
          </div>

          <p className="text-lg font-medium text-slate-700 mb-1">
            {isDragActive ? "Drop files here" : "Drag & drop files or click to browse"}
          </p>
          <p className="text-sm text-slate-500 mb-3">Supports PDF, DOCX, XLSX, PPTX, CSV, TXT</p>

          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className="text-xs bg-violet-50 text-violet-600 border-violet-200">
              <Brain className="w-3 h-3 mr-1" />
              Deep Analysis
            </Badge>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
              <MessageSquare className="w-3 h-3 mr-1" />
              Chat Q&A
            </Badge>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200">
              <Shield className="w-3 h-3 mr-1" />
              Compliance Check
            </Badge>
          </div>
        </div>
      </div>

      {/* Document List */}
      <AnimatePresence>
        {documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Uploaded Documents ({documents.length})</h3>
            </div>

            {documents.map((doc) => {
              const config = getFileConfig(doc)
              const Icon = config.icon
              const isExpanded = expandedAnalysis.has(doc.id)
              const isReanalyzingDoc = reanalyzing.has(doc.id)

              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                >
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {/* File Icon */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br",
                          config.gradient,
                        )}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">{doc.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {config.label}
                          </Badge>
                          {doc.status === "analyzing" && (
                            <Badge className="text-xs bg-violet-100 text-violet-600">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Analyzing
                            </Badge>
                          )}
                          {doc.analysis && (
                            <Badge className="text-xs bg-emerald-100 text-emerald-600">
                              <Brain className="w-3 h-3 mr-1" />
                              Analyzed
                            </Badge>
                          )}
                          {doc.status === "error" && (
                            <Badge className="text-xs bg-red-100 text-red-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {doc.status === "ready" && doc.content && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => analyzeDocument(doc.id, doc.content, doc.name, true)}
                            disabled={isReanalyzingDoc}
                            className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                          >
                            <RefreshCw className={cn("w-4 h-4 mr-1", isReanalyzingDoc && "animate-spin")} />
                            {isReanalyzingDoc ? "Analyzing..." : "Re-analyze"}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleViewDocument(doc)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditDocument(doc)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleExport(doc, "docx")}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDocument(doc.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Analysis Toggle */}
                    {doc.analysis && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAnalysis(doc.id)}
                        className="mt-3 w-full justify-between text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-violet-500" />
                          View AI Analysis
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>

                  {/* Analysis Panel */}
                  <AnimatePresence>{isExpanded && doc.analysis && renderEnhancedAnalysis(doc)}</AnimatePresence>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
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
              toast({
                title: "Document updated",
                description: "Your changes have been saved.",
              })
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
    </motion.div>
  )
}
