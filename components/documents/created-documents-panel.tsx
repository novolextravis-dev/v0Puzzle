"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
  FileSpreadsheet,
  File,
  Clock,
  Sparkles,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHRStore, type CreatedDocument } from "@/lib/store"
import { Button } from "@/components/ui/button"

export function CreatedDocumentsPanel() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(true) // Start minimized by default
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const { createdDocuments, removeCreatedDocument, clearCreatedDocuments } = useHRStore()

  const hasDocuments = createdDocuments.length > 0

  const getDocIcon = (type: string) => {
    if (type.includes("spreadsheet") || type.includes("xlsx") || type.includes("csv")) {
      return <FileSpreadsheet className="w-4 h-4" />
    }
    if (type.includes("presentation") || type.includes("pptx")) {
      return <File className="w-4 h-4" />
    }
    return <FileText className="w-4 h-4" />
  }

  const getDocColors = (type: string) => {
    if (type.includes("spreadsheet") || type.includes("xlsx") || type.includes("csv")) {
      return {
        bg: "bg-emerald-50",
        iconBg: "bg-emerald-100",
        iconText: "text-emerald-600",
      }
    }
    if (type.includes("presentation") || type.includes("pptx")) {
      return {
        bg: "bg-orange-50",
        iconBg: "bg-orange-100",
        iconText: "text-orange-600",
      }
    }
    return {
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  const handleDownload = async (doc: CreatedDocument, format: "docx" | "txt") => {
    setDownloadingId(doc.id)
    try {
      const response = await fetch("/api/export-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: doc.content,
          format,
          filename: doc.title.replace(/[^a-z0-9]/gi, "_").toLowerCase(),
        }),
      })

      if (!response.ok) throw new Error("Export failed")

      const data = await response.json()

      // Convert base64 to blob
      const binaryString = atob(data.file)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const mimeType =
        format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/plain"

      const blob = new Blob([bytes], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${doc.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download failed:", error)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "fixed bottom-4 left-4 z-50",
        "bg-white/95 backdrop-blur-xl",
        "rounded-2xl shadow-2xl shadow-black/10",
        "border border-slate-200/50",
        "overflow-hidden",
        isMinimized ? "w-auto" : "w-80",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          "bg-gradient-to-r from-violet-500/10 to-blue-500/10",
          "border-b border-slate-200/50",
          "cursor-pointer",
          "hover:bg-gradient-to-r hover:from-violet-500/20 hover:to-blue-500/20",
          "transition-all",
        )}
        onClick={() => {
          if (isMinimized) {
            setIsMinimized(false)
          } else {
            setIsExpanded(!isExpanded)
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="w-5 h-5 text-violet-600" />
            {hasDocuments && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {createdDocuments.length}
              </span>
            )}
          </div>
          {!isMinimized && <span className="font-medium text-slate-900 text-sm">Created Documents</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(!isMinimized)
            }}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          {!isMinimized && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!isMinimized && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {!hasDocuments ? (
                <div className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <FolderOpen className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">No documents yet</p>
                  <p className="text-xs text-slate-500 mt-1">Ask the AI to create a document and it will appear here</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {/* Clear all button */}
                  <div className="flex justify-end">
                    <button
                      onClick={clearCreatedDocuments}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  {/* Document list */}
                  {createdDocuments.map((doc) => {
                    const colors = getDocColors(doc.type)
                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={cn("group p-3 rounded-xl", colors.bg, "hover:shadow-md transition-shadow")}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg", colors.iconBg, colors.iconText)}>
                            {getDocIcon(doc.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 text-sm truncate">{doc.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-500">{formatTime(doc.createdAt)}</span>
                            </div>

                            {/* Preview */}
                            <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                              {doc.content.substring(0, 100)}...
                            </p>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 bg-transparent"
                                onClick={() => handleDownload(doc, "docx")}
                                disabled={downloadingId === doc.id}
                              >
                                <Download className="w-3 h-3" />
                                DOCX
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 bg-transparent"
                                onClick={() => handleDownload(doc, "txt")}
                                disabled={downloadingId === doc.id}
                              >
                                <Download className="w-3 h-3" />
                                TXT
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 ml-auto opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeCreatedDocument(doc.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
