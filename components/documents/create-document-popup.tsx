"use client"

import type React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  ClipboardList,
  Mail,
  BookOpen,
  FileCheck,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Save,
  Plus,
  X,
  CheckCircle2,
  Circle,
  Brain,
  Database,
  Wand2,
  FileOutput,
  Zap,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FloatingPopup } from "@/components/ui/floating-popup"
import { useHRStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ProgressStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  status: "pending" | "active" | "completed" | "error"
  duration?: number
}

interface GenerationProgress {
  isVisible: boolean
  currentStep: number
  steps: ProgressStep[]
  startTime: number | null
  logs: { time: string; message: string; type: "info" | "success" | "warning" | "error" }[]
}

interface CreateDocumentPopupProps {
  isOpen: boolean
  onClose: () => void
  initialParams?: {
    documentType?: string
    title?: string
    description?: string
  } | null
}

const documentTypes = [
  {
    id: "policy",
    label: "HR Policy",
    icon: FileText,
    description: "Company policies and guidelines",
    color: "bg-blue-500",
  },
  {
    id: "handbook",
    label: "Handbook Section",
    icon: BookOpen,
    description: "Employee handbook content",
    color: "bg-green-500",
  },
  {
    id: "letter",
    label: "HR Letter",
    icon: Mail,
    description: "Offer letters, termination, etc.",
    color: "bg-purple-500",
  },
  {
    id: "checklist",
    label: "Checklist",
    icon: ClipboardList,
    description: "Onboarding, offboarding, etc.",
    color: "bg-orange-500",
  },
  {
    id: "report",
    label: "HR Report",
    icon: FileCheck,
    description: "Performance, analytics reports",
    color: "bg-red-500",
  },
  {
    id: "presentation",
    label: "Presentation",
    icon: Presentation,
    description: "Training, meetings slides",
    color: "bg-pink-500",
  },
  { id: "form", label: "HR Form", icon: FileText, description: "Application, evaluation forms", color: "bg-cyan-500" },
  {
    id: "procedure",
    label: "Procedure",
    icon: ClipboardList,
    description: "Step-by-step processes",
    color: "bg-amber-500",
  },
  { id: "memo", label: "Memo", icon: Mail, description: "Internal communications", color: "bg-indigo-500" },
  {
    id: "spreadsheet",
    label: "Spreadsheet",
    icon: FileSpreadsheet,
    description: "Data tables and trackers",
    color: "bg-emerald-500",
  },
]

const templates = {
  policy: [
    "Remote Work Policy",
    "Anti-Harassment Policy",
    "Leave of Absence Policy",
    "Code of Conduct",
    "Data Privacy Policy",
    "Social Media Policy",
    "Dress Code Policy",
    "Travel & Expense Policy",
  ],
  handbook: [
    "Welcome & Company Overview",
    "Benefits & Compensation",
    "Time Off & Leave",
    "Workplace Conduct",
    "Health & Safety",
    "Performance Management",
  ],
  letter: [
    "Offer Letter",
    "Promotion Letter",
    "Termination Letter",
    "Warning Letter",
    "Reference Letter",
    "Salary Increase Letter",
  ],
  checklist: [
    "New Hire Onboarding",
    "Employee Offboarding",
    "Performance Review Prep",
    "Interview Checklist",
    "Compliance Audit",
    "Benefits Enrollment",
  ],
  report: [
    "Monthly HR Metrics",
    "Annual Performance Summary",
    "Turnover Analysis",
    "Training Completion",
    "Diversity & Inclusion",
    "Employee Satisfaction",
  ],
  presentation: [
    "Company Orientation",
    "Benefits Overview",
    "Compliance Training",
    "Leadership Development",
    "Team Building Workshop",
    "Policy Update Briefing",
  ],
  form: [
    "Job Application",
    "Performance Evaluation",
    "Leave Request",
    "Expense Reimbursement",
    "Exit Interview",
    "Training Feedback",
  ],
  procedure: [
    "Hiring Process",
    "Disciplinary Action",
    "Grievance Handling",
    "Payroll Processing",
    "Benefits Administration",
    "Employee Transfer",
  ],
  memo: [
    "Policy Update Announcement",
    "Office Closure Notice",
    "Benefits Change Notice",
    "Meeting Minutes",
    "Project Update",
    "Team Announcement",
  ],
  spreadsheet: [
    "Employee Directory",
    "Training Tracker",
    "PTO Calendar",
    "Recruitment Pipeline",
    "Budget Tracker",
    "Performance Scores",
  ],
}

export function CreateDocumentPopup({ isOpen, onClose, initialParams }: CreateDocumentPopupProps) {
  const [step, setStep] = useState<"type" | "details" | "preview">("type")
  const [selectedType, setSelectedType] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [customSections, setCustomSections] = useState<string[]>([])
  const [newSection, setNewSection] = useState("")
  const [customInstructions, setCustomInstructions] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const [progress, setProgress] = useState<GenerationProgress>({
    isVisible: false,
    currentStep: 0,
    steps: [],
    startTime: null,
    logs: [],
  })
  const progressLogRef = useRef<HTMLDivElement>(null)

  const { coreMemory, aiSettings, addDocument, addCreatedDocument } = useHRStore()
  const { toast } = useToast()

  useEffect(() => {
    if (progressLogRef.current) {
      progressLogRef.current.scrollTop = progressLogRef.current.scrollHeight
    }
  }, [progress.logs])

  useEffect(() => {
    if (isOpen && initialParams) {
      if (initialParams.documentType) {
        setSelectedType(initialParams.documentType)
        setStep("details")
      }
      if (initialParams.title) {
        setTitle(initialParams.title)
      }
      if (initialParams.description) {
        setDescription(initialParams.description)
      }
    }
  }, [isOpen, initialParams])

  const resetForm = useCallback(() => {
    setStep("type")
    setSelectedType("")
    setTitle("")
    setDescription("")
    setCustomSections([])
    setNewSection("")
    setCustomInstructions("")
    setSelectedTemplate("")
    setGeneratedContent("")
    setProgress({
      isVisible: false,
      currentStep: 0,
      steps: [],
      startTime: null,
      logs: [],
    })
  }, [])

  const addLog = useCallback((message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
    setProgress((prev) => ({
      ...prev,
      logs: [...prev.logs, { time, message, type }],
    }))
  }, [])

  const updateStep = useCallback((stepIndex: number, status: ProgressStep["status"]) => {
    setProgress((prev) => ({
      ...prev,
      currentStep: status === "active" ? stepIndex : prev.currentStep,
      steps: prev.steps.map((s, i) =>
        i === stepIndex
          ? { ...s, status, duration: status === "completed" ? Date.now() - (prev.startTime || Date.now()) : undefined }
          : s,
      ),
    }))
  }, [])

  const initializeProgress = useCallback(() => {
    const steps: ProgressStep[] = [
      {
        id: "init",
        label: "Initializing",
        description: "Setting up document generation environment",
        icon: <Zap className="w-4 h-4" />,
        status: "pending",
      },
      {
        id: "memory",
        label: "Loading Context",
        description: "Retrieving core memory and company data",
        icon: <Database className="w-4 h-4" />,
        status: "pending",
      },
      {
        id: "analyze",
        label: "Analyzing Requirements",
        description: "Processing document specifications",
        icon: <Brain className="w-4 h-4" />,
        status: "pending",
      },
      {
        id: "generate",
        label: "AI Generation",
        description: "Generating document content with Grok",
        icon: <Wand2 className="w-4 h-4" />,
        status: "pending",
      },
      {
        id: "format",
        label: "Formatting",
        description: "Applying professional styling",
        icon: <FileOutput className="w-4 h-4" />,
        status: "pending",
      },
      {
        id: "finalize",
        label: "Finalizing",
        description: "Preparing document for preview",
        icon: <CheckCircle2 className="w-4 h-4" />,
        status: "pending",
      },
    ]

    setProgress({
      isVisible: true,
      currentStep: 0,
      steps,
      startTime: Date.now(),
      logs: [],
    })
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  const handleTypeSelect = useCallback((typeId: string) => {
    setSelectedType(typeId)
    setStep("details")
  }, [])

  const handleAddSection = useCallback(() => {
    if (newSection.trim() && !customSections.includes(newSection.trim())) {
      setCustomSections([...customSections, newSection.trim()])
      setNewSection("")
    }
  }, [newSection, customSections])

  const handleRemoveSection = useCallback(
    (section: string) => {
      setCustomSections(customSections.filter((s) => s !== section))
    },
    [customSections],
  )

  const handleGenerate = useCallback(async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your document",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    initializeProgress()

    try {
      // Step 1: Initialize
      updateStep(0, "active")
      addLog("Starting document generation process...", "info")
      addLog(`Document type: ${selectedType}`, "info")
      addLog(`Title: "${title}"`, "info")
      await new Promise((r) => setTimeout(r, 300))
      addLog("Generation environment ready", "success")
      updateStep(0, "completed")

      // Step 2: Load Context
      updateStep(1, "active")
      addLog("Loading core memory documents...", "info")
      await new Promise((r) => setTimeout(r, 200))
      if (aiSettings.useCorememory && coreMemory.length > 0) {
        addLog(`Found ${coreMemory.length} document(s) in core memory`, "success")
        coreMemory.forEach((doc, i) => {
          addLog(`  [${i + 1}] ${doc.name} (${doc.content.length} chars)`, "info")
        })
      } else {
        addLog("No core memory documents loaded", "warning")
      }
      addLog("Context loading complete", "success")
      updateStep(1, "completed")

      // Step 3: Analyze Requirements
      updateStep(2, "active")
      addLog("Analyzing document requirements...", "info")
      await new Promise((r) => setTimeout(r, 200))
      addLog(`Template: ${selectedTemplate || "Custom"}`, "info")
      if (description) {
        addLog(`Description: "${description.substring(0, 50)}${description.length > 50 ? "..." : ""}"`, "info")
      }
      if (customSections.length > 0) {
        addLog(`Custom sections: ${customSections.join(", ")}`, "info")
      }
      addLog("Requirements analysis complete", "success")
      updateStep(2, "completed")

      // Step 4: AI Generation
      updateStep(3, "active")
      addLog("Connecting to Grok AI...", "info")
      await new Promise((r) => setTimeout(r, 100))
      addLog("Sending generation request...", "info")

      const response = await fetch("/api/create-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: selectedType,
          title,
          description,
          template: selectedTemplate,
          sections: customSections,
          customInstructions,
          coreMemory: aiSettings.useCorememory ? coreMemory : [],
          aiSettings,
        }),
      })

      addLog("Response received from AI", "info")

      const data = await response.json()
      if (data.error) {
        addLog(`Error: ${data.error}`, "error")
        throw new Error(data.error)
      }

      addLog(`Generated ${data.content.length} characters of content`, "success")
      addLog("AI generation complete", "success")
      updateStep(3, "completed")

      // Step 5: Format
      updateStep(4, "active")
      addLog("Applying professional formatting...", "info")
      await new Promise((r) => setTimeout(r, 300))
      addLog("Formatting headers and sections...", "info")
      await new Promise((r) => setTimeout(r, 200))
      addLog("Formatting complete", "success")
      updateStep(4, "completed")

      // Step 6: Finalize
      updateStep(5, "active")
      addLog("Finalizing document...", "info")
      await new Promise((r) => setTimeout(r, 200))

      setGeneratedContent(data.content)

      // Save to created documents store
      addCreatedDocument({
        id: `doc-${Date.now()}`,
        title,
        type: selectedType,
        content: data.content,
        createdAt: new Date().toISOString(),
      })

      addLog("Document saved to Created Documents", "success")
      addLog("Document ready for preview and export", "success")
      updateStep(5, "completed")

      // Small delay before transitioning
      await new Promise((r) => setTimeout(r, 500))

      setStep("preview")
      setProgress((prev) => ({ ...prev, isVisible: false }))

      toast({
        title: "Document Created",
        description: "Your document has been generated successfully",
      })
    } catch (error) {
      addLog(`Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate document",
        variant: "destructive",
      })
      setProgress((prev) => ({ ...prev, isVisible: false }))
    } finally {
      setIsGenerating(false)
    }
  }, [
    selectedType,
    title,
    description,
    selectedTemplate,
    customSections,
    customInstructions,
    coreMemory,
    aiSettings,
    toast,
    initializeProgress,
    updateStep,
    addLog,
    addCreatedDocument,
  ])

  const handleRegenerate = useCallback(async () => {
    setIsGenerating(true)
    initializeProgress()

    try {
      updateStep(0, "active")
      addLog("Starting regeneration...", "info")
      await new Promise((r) => setTimeout(r, 200))
      updateStep(0, "completed")

      updateStep(1, "active")
      addLog("Loading previous context...", "info")
      await new Promise((r) => setTimeout(r, 200))
      updateStep(1, "completed")

      updateStep(2, "active")
      addLog("Analyzing for variation...", "info")
      await new Promise((r) => setTimeout(r, 200))
      updateStep(2, "completed")

      updateStep(3, "active")
      addLog("Requesting new variation from Grok AI...", "info")

      const response = await fetch("/api/create-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: selectedType,
          title,
          description,
          template: selectedTemplate,
          sections: customSections,
          customInstructions: customInstructions + "\n\nPlease generate a different variation of this document.",
          coreMemory: aiSettings.useCorememory ? coreMemory : [],
          aiSettings,
        }),
      })

      const data = await response.json()
      if (data.error) {
        addLog(`Error: ${data.error}`, "error")
        throw new Error(data.error)
      }

      addLog("New variation generated successfully", "success")
      updateStep(3, "completed")

      updateStep(4, "active")
      addLog("Applying formatting...", "info")
      await new Promise((r) => setTimeout(r, 200))
      updateStep(4, "completed")

      updateStep(5, "active")
      addLog("Finalizing...", "info")
      setGeneratedContent(data.content)
      await new Promise((r) => setTimeout(r, 200))
      updateStep(5, "completed")

      await new Promise((r) => setTimeout(r, 300))
      setProgress((prev) => ({ ...prev, isVisible: false }))

      toast({
        title: "Document Regenerated",
        description: "A new version has been generated",
      })
    } catch (error) {
      addLog(`Regeneration failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
      toast({
        title: "Regeneration Failed",
        description: error instanceof Error ? error.message : "Failed to regenerate",
        variant: "destructive",
      })
      setProgress((prev) => ({ ...prev, isVisible: false }))
    } finally {
      setIsGenerating(false)
    }
  }, [
    selectedType,
    title,
    description,
    selectedTemplate,
    customSections,
    customInstructions,
    coreMemory,
    aiSettings,
    toast,
    initializeProgress,
    updateStep,
    addLog,
  ])

  const handleExport = useCallback(
    async (format: "docx" | "txt" | "xlsx" | "csv") => {
      setIsExporting(true)
      try {
        const response = await fetch("/api/export-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: generatedContent,
            format,
            fileName: title.replace(/[^a-zA-Z0-9]/g, "_"),
          }),
        })

        const data = await response.json()
        if (data.error) throw new Error(data.error)

        const byteCharacters = atob(data.file)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: data.mimeType })

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = data.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        toast({
          title: "Export Successful",
          description: `Document exported as ${format.toUpperCase()}`,
        })
      } catch (error) {
        toast({
          title: "Export Failed",
          description: error instanceof Error ? error.message : "Failed to export document",
          variant: "destructive",
        })
      } finally {
        setIsExporting(false)
      }
    },
    [generatedContent, title, toast],
  )

  const handleSaveToDocuments = useCallback(() => {
    const docType = selectedType === "spreadsheet" ? "xlsx" : "docx"
    addDocument({
      id: `created-${Date.now()}`,
      name: `${title}.${docType}`,
      type: docType,
      content: generatedContent,
      status: "ready",
      metadata: {
        fileName: `${title}.${docType}`,
        fileType: docType,
        processedAt: new Date().toISOString(),
        createdBy: "AI Document Creator",
      },
    })

    toast({
      title: "Saved to Documents",
      description: "Document added to your uploads",
    })
  }, [selectedType, title, generatedContent, addDocument, toast])

  const selectedTypeInfo = documentTypes.find((t) => t.id === selectedType)
  const availableTemplates = selectedType ? templates[selectedType as keyof typeof templates] || [] : []

  const elapsedTime = progress.startTime ? Math.floor((Date.now() - progress.startTime) / 1000) : 0

  return (
    <FloatingPopup
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Document"
      subtitle="AI-powered document generation"
      icon={<Sparkles className="w-5 h-5" />}
      defaultSize="wide"
    >
      <div className="flex flex-col h-full relative">
        <AnimatePresence>
          {progress.isVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col"
            >
              {/* Progress Header */}
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Generating Document</h3>
                      <p className="text-sm text-slate-400">{title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-mono">{elapsedTime}s</span>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-2">
                  {progress.steps.map((s, i) => (
                    <div key={s.id} className="flex items-center">
                      <motion.div
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          s.status === "completed" && "bg-green-500/20 text-green-400",
                          s.status === "active" && "bg-blue-500/20 text-blue-400",
                          s.status === "pending" && "bg-slate-700/50 text-slate-500",
                          s.status === "error" && "bg-red-500/20 text-red-400",
                        )}
                        animate={s.status === "active" ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                      >
                        {s.status === "completed" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : s.status === "active" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Circle className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">{s.label}</span>
                      </motion.div>
                      {i < progress.steps.length - 1 && (
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 mx-1",
                            progress.steps[i + 1].status !== "pending" ? "text-slate-500" : "text-slate-700",
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Step Detail */}
              <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                {progress.steps[progress.currentStep] && (
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                    >
                      {progress.steps[progress.currentStep].icon}
                    </motion.div>
                    <div>
                      <h4 className="text-white font-medium">{progress.steps[progress.currentStep].label}</h4>
                      <p className="text-sm text-slate-400">{progress.steps[progress.currentStep].description}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Log Output */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Process Log</span>
                  <span className="text-xs text-slate-500">{progress.logs.length} entries</span>
                </div>
                <div
                  ref={progressLogRef}
                  className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin"
                >
                  {progress.logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex gap-3",
                        log.type === "success" && "text-green-400",
                        log.type === "error" && "text-red-400",
                        log.type === "warning" && "text-amber-400",
                        log.type === "info" && "text-slate-300",
                      )}
                    >
                      <span className="text-slate-500 flex-shrink-0">[{log.time}]</span>
                      <span>{log.message}</span>
                    </motion.div>
                  ))}
                  {isGenerating && (
                    <motion.div
                      className="flex items-center gap-2 text-slate-400"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                    >
                      <span className="text-slate-500">
                        [
                        {new Date().toLocaleTimeString("en-US", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                        ]
                      </span>
                      <span>Processing...</span>
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="p-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Overall Progress</span>
                  <span>
                    {Math.round(
                      (progress.steps.filter((s) => s.status === "completed").length / progress.steps.length) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(progress.steps.filter((s) => s.status === "completed").length / progress.steps.length) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 p-4 border-b border-slate-200/50 bg-slate-50/50">
          {["type", "details", "preview"].map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => {
                  if (s === "type") setStep("type")
                  else if (s === "details" && selectedType) setStep("details")
                  else if (s === "preview" && generatedContent) setStep("preview")
                }}
                disabled={(s === "details" && !selectedType) || (s === "preview" && !generatedContent)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  step === s
                    ? "bg-blue-500 text-white"
                    : s === "type" || (s === "details" && selectedType) || (s === "preview" && generatedContent)
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed",
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                {s === "type" ? "Type" : s === "details" ? "Details" : "Preview"}
              </button>
              {i < 2 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Document Type Selection */}
            {step === "type" && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">What type of document do you need?</h3>
                  <p className="text-sm text-slate-500">Select a document type to get started</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {documentTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <motion.button
                        key={type.id}
                        onClick={() => handleTypeSelect(type.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                          "hover:border-blue-300 hover:bg-blue-50/50",
                          selectedType === type.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white",
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", type.color)}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{type.label}</span>
                        <span className="text-xs text-slate-500 text-center">{type.description}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Document Details */}
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  {selectedTypeInfo && (
                    <>
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                          selectedTypeInfo.color,
                        )}
                      >
                        <selectedTypeInfo.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{selectedTypeInfo.label}</h3>
                        <p className="text-sm text-slate-500">{selectedTypeInfo.description}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`e.g., ${availableTemplates[0] || "Enter document title"}`}
                    className="h-11"
                  />
                </div>

                {/* Quick Templates */}
                {availableTemplates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Quick Templates</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableTemplates.map((template) => (
                        <Badge
                          key={template}
                          variant={selectedTemplate === template ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-colors",
                            selectedTemplate === template ? "bg-blue-500 hover:bg-blue-600" : "hover:bg-slate-100",
                          )}
                          onClick={() => {
                            setSelectedTemplate(selectedTemplate === template ? "" : template)
                            if (!title && selectedTemplate !== template) {
                              setTitle(template)
                            }
                          }}
                        >
                          {template}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Purpose / Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the purpose and any specific requirements for this document..."
                    rows={3}
                  />
                </div>

                {/* Custom Sections */}
                <div className="space-y-2">
                  <Label>Custom Sections (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSection}
                      onChange={(e) => setNewSection(e.target.value)}
                      placeholder="Add a section..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
                    />
                    <Button onClick={handleAddSection} size="icon" variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {customSections.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customSections.map((section) => (
                        <Badge key={section} variant="secondary" className="gap-1">
                          {section}
                          <button onClick={() => handleRemoveSection(section)} className="ml-1 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Instructions */}
                <div className="space-y-2">
                  <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Any specific tone, style, or content requirements..."
                    rows={2}
                  />
                </div>

                {/* Core Memory Notice */}
                {coreMemory.length > 0 && aiSettings.useCorememory && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    <span className="text-sm text-violet-700">
                      Using {coreMemory.length} document(s) from Core Memory for context
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <Button variant="ghost" onClick={() => setStep("type")}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleGenerate} disabled={isGenerating || !title.trim()}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Document
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Preview & Export */}
            {step === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500">{selectedTypeInfo?.label} - Ready for export</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                      {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                      {showPreview ? "Hide" : "Show"} Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isGenerating}>
                      <RefreshCw className={cn("w-4 h-4 mr-1", isGenerating && "animate-spin")} />
                      Regenerate
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                {showPreview && (
                  <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Document Preview</span>
                      <span className="text-xs text-slate-500">
                        {generatedContent.length.toLocaleString()} characters
                      </span>
                    </div>
                    <div className="p-6 max-h-[400px] overflow-y-auto scrollbar-thin">
                      <div className="prose prose-sm max-w-none">
                        {generatedContent.split("\n").map((line, i) => {
                          if (line.startsWith("# ")) {
                            return (
                              <h1 key={i} className="text-xl font-bold text-slate-900 mt-4 mb-2">
                                {line.slice(2)}
                              </h1>
                            )
                          } else if (line.startsWith("## ")) {
                            return (
                              <h2 key={i} className="text-lg font-semibold text-slate-800 mt-3 mb-2">
                                {line.slice(3)}
                              </h2>
                            )
                          } else if (line.startsWith("### ")) {
                            return (
                              <h3 key={i} className="text-base font-medium text-slate-700 mt-2 mb-1">
                                {line.slice(4)}
                              </h3>
                            )
                          } else if (line.startsWith("- ") || line.startsWith("* ")) {
                            return (
                              <li key={i} className="text-slate-600 ml-4">
                                {line.slice(2)}
                              </li>
                            )
                          } else if (line.match(/^\d+\. /)) {
                            return (
                              <li key={i} className="text-slate-600 ml-4 list-decimal">
                                {line.replace(/^\d+\. /, "")}
                              </li>
                            )
                          } else if (line.startsWith("[ ]")) {
                            return (
                              <li key={i} className="text-slate-600 ml-4 list-none flex items-center gap-2">
                                <input type="checkbox" disabled className="rounded" />
                                {line.slice(3)}
                              </li>
                            )
                          } else if (line.startsWith("[x]") || line.startsWith("[X]")) {
                            return (
                              <li key={i} className="text-slate-600 ml-4 list-none flex items-center gap-2">
                                <input type="checkbox" checked disabled className="rounded" />
                                {line.slice(3)}
                              </li>
                            )
                          } else if (line.includes("|")) {
                            return (
                              <code key={i} className="block text-xs bg-slate-50 p-1 rounded my-1 font-mono">
                                {line}
                              </code>
                            )
                          } else if (line.trim() === "") {
                            return <br key={i} />
                          } else {
                            return (
                              <p key={i} className="text-slate-600 my-1">
                                {line}
                              </p>
                            )
                          }
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Edit Content</Label>
                    <span className="text-xs text-slate-500">Markdown supported</span>
                  </div>
                  <Textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Export Options */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <Label>Export As</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleExport("docx")}
                      disabled={isExporting}
                      variant="outline"
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      Word (.docx)
                    </Button>
                    <Button
                      onClick={() => handleExport("txt")}
                      disabled={isExporting}
                      variant="outline"
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      Text (.txt)
                    </Button>
                    {selectedType === "spreadsheet" && (
                      <>
                        <Button
                          onClick={() => handleExport("xlsx")}
                          disabled={isExporting}
                          variant="outline"
                          className="gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-green-500" />
                          Excel (.xlsx)
                        </Button>
                        <Button
                          onClick={() => handleExport("csv")}
                          disabled={isExporting}
                          variant="outline"
                          className="gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                          CSV (.csv)
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <Button variant="ghost" onClick={() => setStep("details")}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Edit Details
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleSaveToDocuments}>
                      <Save className="w-4 h-4 mr-2" />
                      Save to Documents
                    </Button>
                    <Button onClick={handleClose}>Done</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </FloatingPopup>
  )
}
