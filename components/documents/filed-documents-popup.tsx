"use client"

import type React from "react"

import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FloatingPopup } from "@/components/ui/floating-popup"
import { useHRStore, type FiledDocument } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FolderOpen,
  Upload,
  Search,
  Filter,
  Calendar,
  Tag,
  FileText,
  Briefcase,
  Users,
  FileCheck,
  Mail,
  DollarSign,
  Heart,
  GraduationCap,
  TrendingUp,
  Scale,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  CheckCircle,
  Archive,
  Eye,
  Trash2,
  Grid,
  List,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  AtSign,
  Copy,
  Check,
  RefreshCw,
  Settings,
  Printer,
  Smartphone,
  Shield,
  Plus,
  Info,
  Zap,
  Send,
  Download,
  FileImage,
  FileSpreadsheet,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FiledDocumentsPopupProps {
  isOpen: boolean
  onClose: () => void
}

const categoryConfig: Record<FiledDocument["category"], { label: string; icon: React.ElementType; color: string }> = {
  contracts: { label: "Contracts", icon: Briefcase, color: "text-blue-400" },
  resumes: { label: "Resumes", icon: Users, color: "text-green-400" },
  policies: { label: "Policies", icon: FileCheck, color: "text-purple-400" },
  forms: { label: "Forms", icon: FileText, color: "text-orange-400" },
  correspondence: { label: "Correspondence", icon: Mail, color: "text-cyan-400" },
  reports: { label: "Reports", icon: TrendingUp, color: "text-yellow-400" },
  payroll: { label: "Payroll", icon: DollarSign, color: "text-emerald-400" },
  benefits: { label: "Benefits", icon: Heart, color: "text-pink-400" },
  training: { label: "Training", icon: GraduationCap, color: "text-indigo-400" },
  performance: { label: "Performance", icon: TrendingUp, color: "text-amber-400" },
  legal: { label: "Legal", icon: Scale, color: "text-red-400" },
  other: { label: "Other", icon: MoreHorizontal, color: "text-gray-400" },
}

const priorityConfig = {
  low: { label: "Low", color: "bg-gray-500/20 text-gray-300" },
  medium: { label: "Medium", color: "bg-blue-500/20 text-blue-300" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-300" },
  urgent: { label: "Urgent", color: "bg-red-500/20 text-red-300" },
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-300", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-green-500/20 text-green-300", icon: CheckCircle },
  "action-required": { label: "Action Required", color: "bg-red-500/20 text-red-300", icon: AlertTriangle },
  archived: { label: "Archived", color: "bg-gray-500/20 text-gray-300", icon: Archive },
}

const getFileIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return FileText
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return FileImage
    case "xlsx":
    case "xls":
    case "csv":
      return FileSpreadsheet
    default:
      return FileText
  }
}

export function FiledDocumentsPopup({ isOpen, onClose }: FiledDocumentsPopupProps) {
  const {
    filedDocuments,
    addFiledDocument,
    updateFiledDocument,
    removeFiledDocument,
    emailFilingSettings,
    updateEmailFilingSettings,
    generateFilingEmail,
    addAIActivity,
    updateAIActivity,
  } = useHRStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest")
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [selectedDocument, setSelectedDocument] = useState<FiledDocument | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(
    null,
  )
  const [activeTab, setActiveTab] = useState<"documents" | "email">("documents")
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [newAllowedSender, setNewAllowedSender] = useState("")
  const [fullViewDocument, setFullViewDocument] = useState<FiledDocument | null>(null)

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let docs = [...filedDocuments]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.summary.toLowerCase().includes(query) ||
          d.tags.some((t) => t.toLowerCase().includes(query)),
      )
    }

    if (selectedCategory && selectedCategory !== "all") {
      docs = docs.filter((d) => d.category === selectedCategory)
    }

    if (selectedDate) {
      docs = docs.filter((d) => d.receivedDate === selectedDate)
    }

    docs.sort((a, b) => {
      if (sortBy === "newest") return b.filedAt - a.filedAt
      return a.filedAt - b.filedAt
    })

    return docs
  }, [filedDocuments, searchQuery, selectedCategory, selectedDate, sortBy])

  // Group documents by category
  const groupedDocuments = useMemo(() => {
    const groups: Record<string, FiledDocument[]> = {}
    filteredDocuments.forEach((doc) => {
      if (!groups[doc.category]) groups[doc.category] = []
      groups[doc.category].push(doc)
    })
    return groups
  }, [filteredDocuments])

  // Today's stats
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    const todayDocs = filedDocuments.filter((d) => d.receivedDate === today)
    return {
      total: todayDocs.length,
      pending: todayDocs.filter((d) => d.status === "pending").length,
      urgent: todayDocs.filter((d) => d.priority === "urgent").length,
    }
  }, [filedDocuments])

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      setIsUploading(true)
      const fileArray = Array.from(files)

      const activityId = `filing-${Date.now()}`
      addAIActivity({
        id: activityId,
        type: "document",
        title: "Filing Documents",
        description: `Processing ${fileArray.length} document(s)...`,
        status: "running",
        progress: 0,
        startedAt: Date.now(),
      })

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        setUploadProgress({ current: i + 1, total: fileArray.length, fileName: file.name })

        updateAIActivity(activityId, {
          description: `Categorizing: ${file.name}`,
          progress: Math.round(((i + 0.5) / fileArray.length) * 100),
        })

        try {
          let content = ""
          let isTextReadable = false

          const textTypes = ["text/", "application/json", "application/xml"]
          const textExtensions = [".txt", ".csv", ".json", ".xml", ".md", ".html", ".htm"]

          if (
            textTypes.some((t) => file.type.startsWith(t)) ||
            textExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
          ) {
            content = await file.text()
            isTextReadable = true
          } else {
            // For binary files, create a description instead
            content = `[Binary File]\nName: ${file.name}\nType: ${file.type || "unknown"}\nSize: ${(file.size / 1024).toFixed(2)} KB`
            isTextReadable = false
          }

          const response = await fetch("/api/categorize-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              content: isTextReadable ? content.substring(0, 5000) : content,
              fileType: file.type,
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to categorize: ${response.statusText}`)
          }

          const result = await response.json()

          const filedDoc: FiledDocument = {
            id: `filed-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            name: result.suggestedName || result.summary?.substring(0, 50) || file.name,
            originalName: file.name,
            content: isTextReadable ? content : `[Binary content - ${file.type}]`,
            preview: isTextReadable
              ? content.substring(0, 500)
              : `Binary file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
            category: result.category || "other",
            tags: result.tags || [],
            priority: result.priority || "medium",
            status: "pending",
            summary: result.summary || `Uploaded document: ${file.name}`,
            extractedData: result.extractedData || {},
            filedAt: Date.now(),
            receivedDate: new Date().toISOString().split("T")[0],
            fileType: file.name.split(".").pop() || "unknown",
            fileSize: file.size,
            source: "upload",
          }

          addFiledDocument(filedDoc)

          updateAIActivity(activityId, {
            description: `Filed: ${file.name} → ${categoryConfig[result.category]?.label || "Other"}`,
            progress: Math.round(((i + 1) / fileArray.length) * 100),
          })
        } catch (error) {
          console.error("Failed to process file:", error)
          updateAIActivity(activityId, {
            description: `Error processing: ${file.name}`,
          })
        }
      }

      updateAIActivity(activityId, {
        status: "completed",
        description: `Filed ${fileArray.length} document(s) successfully`,
        progress: 100,
        completedAt: Date.now(),
      })

      setIsUploading(false)
      setUploadProgress(null)
    },
    [addFiledDocument, addAIActivity, updateAIActivity],
  )

  const copyEmailToClipboard = useCallback(() => {
    if (emailFilingSettings.filingEmail) {
      navigator.clipboard.writeText(emailFilingSettings.filingEmail)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }, [emailFilingSettings.filingEmail])

  const handleGenerateEmail = useCallback(() => {
    generateFilingEmail()
  }, [generateFilingEmail])

  const handleAddAllowedSender = useCallback(() => {
    if (newAllowedSender && newAllowedSender.includes("@")) {
      updateEmailFilingSettings({
        allowedSenders: [...emailFilingSettings.allowedSenders, newAllowedSender],
      })
      setNewAllowedSender("")
    }
  }, [newAllowedSender, emailFilingSettings.allowedSenders, updateEmailFilingSettings])

  const handleRemoveAllowedSender = useCallback(
    (email: string) => {
      updateEmailFilingSettings({
        allowedSenders: emailFilingSettings.allowedSenders.filter((s) => s !== email),
      })
    },
    [emailFilingSettings.allowedSenders, updateEmailFilingSettings],
  )

  const handleOpenFull = useCallback((doc: FiledDocument) => {
    setFullViewDocument(doc)
    setSelectedDocument(null)
  }, [])

  const handleDownloadDocument = useCallback((doc: FiledDocument) => {
    const mimeTypes: Record<string, string> = {
      txt: "text/plain",
      csv: "text/csv",
      json: "application/json",
      xml: "application/xml",
      html: "text/html",
      md: "text/markdown",
    }

    const mimeType = mimeTypes[doc.fileType.toLowerCase()] || "text/plain"
    const blob = new Blob([doc.content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = doc.originalName || `${doc.name}.${doc.fileType}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  return (
    <FloatingPopup
      isOpen={isOpen}
      onClose={onClose}
      title="Filed Documents"
      subtitle="AI-categorized document filing system"
      icon={<FolderOpen className="h-5 w-5" />}
      size="large"
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "documents" | "email")}
        className="flex flex-col h-full"
      >
        <TabsList className="grid grid-cols-2 mx-4 mb-4 bg-white/5">
          <TabsTrigger value="documents" className="data-[state=active]:bg-white/10">
            <FolderOpen className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-white/10">
            <Mail className="h-4 w-4 mr-2" />
            Email Filing
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="flex-1 flex flex-col mt-0 overflow-hidden">
          {/* Stats Bar */}
          <div className="flex items-center gap-4 px-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span className="text-white/60">Today:</span>
              <span className="text-white font-medium">{todayStats.total} docs</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-300">{todayStats.pending} pending</span>
            </div>
            {todayStats.urgent > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-300">{todayStats.urgent} urgent</span>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/10">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[150px] bg-white/5 border-white/10 text-white"
            />

            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn("h-8 w-8 p-0", viewMode === "list" && "bg-white/10")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn("h-8 w-8 p-0", viewMode === "grid" && "bg-white/10")}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
              />
              <Button variant="outline" size="sm" disabled={isUploading} asChild>
                <span>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading && uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : "Upload"}
                </span>
              </Button>
            </label>
          </div>

          {/* Upload Progress Banner */}
          <AnimatePresence>
            {uploadProgress && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20"
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-sm text-blue-300">
                    Processing {uploadProgress.current}/{uploadProgress.total}: {uploadProgress.fileName}
                  </span>
                </div>
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Document List */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents filed yet</p>
                  <p className="text-sm mt-2">Upload documents or send them via email</p>
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-4">
                  {Object.entries(groupedDocuments).map(([category, docs]) => {
                    const config = categoryConfig[category as FiledDocument["category"]]
                    const Icon = config.icon
                    const isExpanded = expandedCategories.includes(category)

                    return (
                      <div key={category} className="bg-white/5 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-white/60" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white/60" />
                          )}
                          <Icon className={cn("h-5 w-5", config.color)} />
                          <span className="font-medium text-white">{config.label}</span>
                          <Badge variant="secondary" className="ml-auto bg-white/10 text-white/70">
                            {docs.length}
                          </Badge>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-white/10"
                            >
                              {docs.map((doc) => {
                                const StatusIcon = statusConfig[doc.status].icon
                                const FileIcon = getFileIcon(doc.fileType)
                                return (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                                    onClick={() => setSelectedDocument(doc)}
                                  >
                                    <FileIcon className="h-4 w-4 text-white/40 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                                      <p className="text-xs text-white/50 truncate">{doc.summary}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {doc.source === "email" && <Mail className="h-3 w-3 text-cyan-400" />}
                                      <Badge className={priorityConfig[doc.priority].color}>{doc.priority}</Badge>
                                      <StatusIcon
                                        className={cn(
                                          "h-4 w-4",
                                          statusConfig[doc.status].color.replace("bg-", "text-").split(" ")[0],
                                        )}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => {
                    const config = categoryConfig[doc.category]
                    const Icon = config.icon
                    return (
                      <motion.div
                        key={doc.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedDocument(doc)}
                        className="bg-white/5 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <Icon className={cn("h-6 w-6", config.color)} />
                          <Badge className={priorityConfig[doc.priority].color}>{doc.priority}</Badge>
                        </div>
                        <h4 className="font-medium text-white text-sm mb-1 line-clamp-2">{doc.name}</h4>
                        <p className="text-xs text-white/50 line-clamp-2 mb-3">{doc.summary}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/40">{doc.receivedDate}</span>
                          {doc.source === "email" && <Mail className="h-3 w-3 text-cyan-400" />}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Email Filing Tab - keeping existing code */}
        <TabsContent value="email" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {/* Section 1: Your Filing Email Address */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <AtSign className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Your Filing Email Address</h3>
                    <p className="text-sm text-white/50">Send documents to this email to auto-file them</p>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-5 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Switch
                      checked={emailFilingSettings.enabled}
                      onCheckedChange={(enabled) => updateEmailFilingSettings({ enabled })}
                      id="email-enabled"
                    />
                    <Label htmlFor="email-enabled" className="text-white font-medium">
                      Enable Email Filing
                    </Label>
                  </div>

                  {emailFilingSettings.enabled && (
                    <div className="space-y-4">
                      {emailFilingSettings.filingEmail ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                            <code className="text-cyan-300 text-base font-mono">{emailFilingSettings.filingEmail}</code>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={copyEmailToClipboard}
                            className="h-12 w-12 border-white/20 hover:bg-white/10 bg-transparent"
                          >
                            {copiedEmail ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleGenerateEmail}
                            className="h-12 w-12 border-white/20 hover:bg-white/10 bg-transparent"
                          >
                            <RefreshCw className="h-5 w-5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleGenerateEmail}
                          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12"
                        >
                          <Zap className="h-5 w-5 mr-2" />
                          Generate My Filing Email
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Section 2: How to Use */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Info className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">How to Use</h3>
                    <p className="text-sm text-white/50">Three easy ways to send documents</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {/* Scanner/Printer */}
                  <div className="bg-black/30 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Printer className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-white font-semibold text-base">Scanner / Printer</h4>
                        <ol className="text-white/70 text-sm space-y-1.5 list-decimal list-inside">
                          <li>Configure your scanner&apos;s &quot;Scan to Email&quot; feature</li>
                          <li>Add your filing email as a destination</li>
                          <li>Scan documents - they&apos;ll be auto-filed!</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Phone/Tablet */}
                  <div className="bg-black/30 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                        <Smartphone className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-white font-semibold text-base">Phone / Tablet</h4>
                        <ol className="text-white/70 text-sm space-y-1.5 list-decimal list-inside">
                          <li>Use your camera or scanner app to capture documents</li>
                          <li>Share or email the scan to your filing address</li>
                          <li>Documents are categorized automatically</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Email Forward */}
                  <div className="bg-black/30 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Send className="h-6 w-6 text-amber-400" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-white font-semibold text-base">Email Forward</h4>
                        <ol className="text-white/70 text-sm space-y-1.5 list-decimal list-inside">
                          <li>Forward any email with attachments to your filing address</li>
                          <li>All attachments will be extracted and filed</li>
                          <li>Email body is saved as context</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Settings */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Settings className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Settings</h3>
                    <p className="text-sm text-white/50">Customize how documents are processed</p>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-5 border border-white/10 space-y-5">
                  {/* Auto-categorize toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-white font-medium">Auto-Categorize</Label>
                      <p className="text-sm text-white/50">AI automatically sorts incoming documents</p>
                    </div>
                    <Switch
                      checked={emailFilingSettings.autoCategorizeViaEmail}
                      onCheckedChange={(autoCategorizeViaEmail) =>
                        updateEmailFilingSettings({ autoCategorizeViaEmail })
                      }
                    />
                  </div>

                  <div className="h-px bg-white/10" />

                  {/* Notifications toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-white font-medium">Notifications</Label>
                      <p className="text-sm text-white/50">Get notified when documents are filed</p>
                    </div>
                    <Switch
                      checked={emailFilingSettings.notifyOnReceive}
                      onCheckedChange={(notifyOnReceive) => updateEmailFilingSettings({ notifyOnReceive })}
                    />
                  </div>

                  <div className="h-px bg-white/10" />

                  {/* Default category */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-white font-medium">Default Category</Label>
                      <p className="text-sm text-white/50">Fallback when AI can&apos;t determine category</p>
                    </div>
                    <Select
                      value={emailFilingSettings.defaultCategory}
                      onValueChange={(defaultCategory) =>
                        updateEmailFilingSettings({
                          defaultCategory: defaultCategory as FiledDocument["category"],
                        })
                      }
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryConfig).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Section 4: Security - Allowed Senders */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Security</h3>
                    <p className="text-sm text-white/50">Only accept documents from trusted senders</p>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-5 border border-white/10 space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter email address..."
                      value={newAllowedSender}
                      onChange={(e) => setNewAllowedSender(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddAllowedSender()}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                    <Button
                      onClick={handleAddAllowedSender}
                      disabled={!newAllowedSender || !newAllowedSender.includes("@")}
                      className="bg-white/10 hover:bg-white/20 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {emailFilingSettings.allowedSenders.length > 0 ? (
                    <div className="space-y-2">
                      {emailFilingSettings.allowedSenders.map((email) => (
                        <div
                          key={email}
                          className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5"
                        >
                          <span className="text-white/80 text-sm">{email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAllowedSender(email)}
                            className="h-7 w-7 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-white/40 text-sm py-4">
                      No restrictions - accepting from all senders
                    </p>
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {selectedDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={() => setSelectedDocument(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  {(() => {
                    const config = categoryConfig[selectedDocument.category]
                    const Icon = config.icon
                    return <Icon className={cn("h-5 w-5", config.color)} />
                  })()}
                  <div>
                    <h3 className="font-semibold text-white">{selectedDocument.name}</h3>
                    <p className="text-xs text-white/50">{selectedDocument.receivedDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedDocument.status}
                    onValueChange={(status) =>
                      updateFiledDocument(selectedDocument.id, {
                        status: status as FiledDocument["status"],
                      })
                    }
                  >
                    <SelectTrigger className="w-[140px] h-8 bg-white/5 border-white/10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenFull(selectedDocument)}
                    className="h-8 w-8"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownloadDocument(selectedDocument)}
                    className="h-8 w-8"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      removeFiledDocument(selectedDocument.id)
                      setSelectedDocument(null)
                    }}
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDocument(null)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[60vh]">
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-medium text-white/50 uppercase mb-2">Summary</h4>
                    <p className="text-white/80 text-sm">{selectedDocument.summary}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-white/10 text-white/70">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {selectedDocument.extractedData && Object.keys(selectedDocument.extractedData).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-white/50 uppercase mb-2">Extracted Data</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedDocument.extractedData).map(([key, value]) => (
                          <div key={key} className="bg-white/5 rounded-lg p-2">
                            <span className="text-xs text-white/50 capitalize">{key.replace(/_/g, " ")}</span>
                            <p className="text-sm text-white">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-medium text-white/50 uppercase mb-2">Preview</h4>
                    <div className="bg-white/5 rounded-lg p-4 font-mono text-xs text-white/70 whitespace-pre-wrap">
                      {selectedDocument.preview || selectedDocument.content.substring(0, 500)}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full View Modal */}
      <AnimatePresence>
        {fullViewDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {(() => {
                  const config = categoryConfig[fullViewDocument.category]
                  const Icon = config.icon
                  return <Icon className={cn("h-5 w-5", config.color)} />
                })()}
                <div>
                  <h3 className="font-semibold text-white">{fullViewDocument.name}</h3>
                  <p className="text-xs text-white/50">
                    {fullViewDocument.originalName} - {fullViewDocument.receivedDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadDocument(fullViewDocument)}
                  className="border-white/20"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setFullViewDocument(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <pre className="font-mono text-sm text-white/80 whitespace-pre-wrap">{fullViewDocument.content}</pre>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPopup>
  )
}
