"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  X,
  FileText,
  FileSpreadsheet,
  Presentation,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Edit3,
  ZoomIn,
  ZoomOut,
  Table,
  List,
  Grid3X3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { Document } from "@/lib/store"

interface RichDocumentPreviewProps {
  document: Document
  onClose: () => void
  onEdit: () => void
  onExport: (format: string) => void
}

export function RichDocumentPreview({ document, onClose, onEdit, onExport }: RichDocumentPreviewProps) {
  const [activeTab, setActiveTab] = useState("content")
  const [copied, setCopied] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<"text" | "structured">("text")

  const handleCopy = () => {
    navigator.clipboard.writeText(document.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isSpreadsheet = document.type === "xlsx" || document.type === "csv"
  const isPDF = document.type === "pdf"
  const isWord = document.type === "docx"
  const isPPTX = document.type === "pptx"

  // Parse spreadsheet content into table format
  const parseSpreadsheetContent = () => {
    const lines = document.content.split("\n").filter((line) => line.trim())
    const rows = lines.map((line) => {
      // Handle both pipe-delimited and comma-delimited formats
      if (line.includes("|")) {
        return line
          .split("|")
          .map((cell) => cell.trim())
          .filter(Boolean)
      }
      return line.split(",").map((cell) => cell.trim())
    })
    return rows
  }

  // Parse document content into pages (approximate)
  const parsePages = () => {
    const words = document.content.split(/\s+/)
    const wordsPerPage = 500
    const pages: string[] = []
    for (let i = 0; i < words.length; i += wordsPerPage) {
      pages.push(words.slice(i, i + wordsPerPage).join(" "))
    }
    return pages.length > 0 ? pages : [document.content]
  }

  const pages = parsePages()
  const totalPages = pages.length
  const spreadsheetData = isSpreadsheet ? parseSpreadsheetContent() : []

  const getFileIcon = () => {
    if (isSpreadsheet) return FileSpreadsheet
    if (isPPTX) return Presentation
    return FileText
  }

  const FileIcon = getFileIcon()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0 bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isSpreadsheet ? "bg-green-100" : isPDF ? "bg-red-100" : "bg-blue-100",
              )}
            >
              <FileIcon
                className={cn("w-6 h-6", isSpreadsheet ? "text-green-600" : isPDF ? "text-red-600" : "text-blue-600")}
              />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{document.name}</h3>
              <p className="text-xs text-slate-500">
                {document.wordCount?.toLocaleString()} words
                {document.metadata?.pageCount && ` • ${document.metadata.pageCount} pages`}
                {document.metadata?.sheetCount && ` • ${document.metadata.sheetCount} sheets`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-white rounded-lg border px-2 py-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs text-slate-600 w-10 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(200, zoom + 10))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={handleCopy} className="rounded-xl bg-transparent">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit} className="rounded-xl bg-transparent">
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 p-1 mx-4 mt-4 bg-slate-100 rounded-xl max-w-sm flex-shrink-0">
            <TabsTrigger value="content" className="rounded-lg text-xs">
              Content
            </TabsTrigger>
            <TabsTrigger value="analysis" className="rounded-lg text-xs">
              Analysis
            </TabsTrigger>
            <TabsTrigger value="export" className="rounded-lg text-xs">
              Export
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
            {/* View mode toggle for spreadsheets */}
            {isSpreadsheet && (
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <span className="text-sm text-slate-600">View:</span>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("text")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md transition-colors",
                      viewMode === "text" ? "bg-white shadow text-slate-900" : "text-slate-600",
                    )}
                  >
                    <List className="w-4 h-4 inline mr-1" />
                    Text
                  </button>
                  <button
                    onClick={() => setViewMode("structured")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md transition-colors",
                      viewMode === "structured" ? "bg-white shadow text-slate-900" : "text-slate-600",
                    )}
                  >
                    <Grid3X3 className="w-4 h-4 inline mr-1" />
                    Table
                  </button>
                </div>
              </div>
            )}

            <div
              className="flex-1 overflow-auto scrollbar-thin bg-white rounded-xl border"
              style={{ fontSize: `${zoom}%` }}
            >
              {isSpreadsheet && viewMode === "structured" ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      {spreadsheetData.length > 0 && (
                        <tr className="bg-slate-100">
                          {spreadsheetData[0].map((cell, i) => (
                            <th
                              key={i}
                              className="border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700"
                            >
                              {cell}
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {spreadsheetData.slice(1).map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="border border-slate-200 px-3 py-2 text-sm text-slate-600">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6">
                  {/* Page navigation for long documents */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mb-4 pb-4 border-b">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="rounded-xl"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-slate-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-xl"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                    {totalPages > 1 ? pages[currentPage - 1] : document.content}
                  </pre>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="flex-1 min-h-0 p-4 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-thin space-y-4">
              {document.analysis ? (
                <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                  <h4 className="font-medium text-violet-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Analysis
                  </h4>
                  <div className="text-sm text-violet-800 whitespace-pre-wrap leading-relaxed">{document.analysis}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="font-medium text-slate-900 mb-2">No Analysis Yet</h4>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Click "Analyze" on the document to generate AI-powered insights.
                  </p>
                </div>
              )}

              {/* Document Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-semibold text-slate-900">{document.wordCount?.toLocaleString() || 0}</p>
                  <p className="text-xs text-slate-500">Words</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-semibold text-slate-900">
                    {document.characterCount?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-slate-500">Characters</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-semibold text-slate-900">
                    {document.metadata?.pageCount || document.metadata?.sheetCount || 1}
                  </p>
                  <p className="text-xs text-slate-500">{document.metadata?.sheetCount ? "Sheets" : "Pages"}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-semibold text-slate-900">{Math.ceil((document.wordCount || 0) / 200)}</p>
                  <p className="text-xs text-slate-500">Min. Read Time</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 min-h-0 p-4 overflow-hidden">
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Export Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => onExport("docx")}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <FileText className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="font-medium text-slate-900">Microsoft Word</p>
                  <p className="text-xs text-slate-500">.docx format</p>
                </button>
                <button
                  onClick={() => onExport("txt")}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors text-left"
                >
                  <FileText className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="font-medium text-slate-900">Plain Text</p>
                  <p className="text-xs text-slate-500">.txt format</p>
                </button>
                <button
                  onClick={() => onExport("xlsx")}
                  className="p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                >
                  <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                  <p className="font-medium text-slate-900">Excel Spreadsheet</p>
                  <p className="text-xs text-slate-500">.xlsx format</p>
                </button>
                <button
                  onClick={() => onExport("csv")}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left"
                >
                  <Table className="w-8 h-8 text-emerald-600 mb-2" />
                  <p className="font-medium text-slate-900">CSV</p>
                  <p className="text-xs text-slate-500">.csv format</p>
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
