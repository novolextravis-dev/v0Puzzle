"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Save, Download, FileText, Sparkles, Loader2, Copy, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Document } from "@/lib/store"

interface DocumentEditorModalProps {
  document: Document
  onClose: () => void
  onSave: (content: string) => void
  onExport: (format: string) => void
}

export function DocumentEditorModal({ document, onClose, onSave, onExport }: DocumentEditorModalProps) {
  const [activeTab, setActiveTab] = useState("preview")
  const [editedContent, setEditedContent] = useState(document.content)
  const [aiInstruction, setAiInstruction] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [exportFormat, setExportFormat] = useState("docx")
  const [copied, setCopied] = useState(false)
  const [aiEditedContent, setAiEditedContent] = useState("")

  const handleSave = () => {
    onSave(editedContent)
    onClose()
  }

  const handleAiEdit = async () => {
    if (!aiInstruction.trim()) return
    setIsProcessing(true)

    try {
      const response = await fetch("/api/edit-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editedContent,
          instruction: aiInstruction,
          documentType: document.name,
        }),
      })

      if (!response.ok) throw new Error("Failed to edit document")

      const data = await response.json()
      if (data.success) {
        setAiEditedContent(data.editedContent)
        setActiveTab("ai-result")
      }
    } catch (error) {
      console.error("AI edit error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const applyAiEdit = () => {
    setEditedContent(aiEditedContent)
    setAiEditedContent("")
    setAiInstruction("")
    setActiveTab("edit")
  }

  const handleExport = () => {
    onExport(exportFormat)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{document.name}</h3>
              <p className="text-xs text-slate-500">
                {document.wordCount?.toLocaleString()} words
                {document.metadata?.pageCount && ` • ${document.metadata.pageCount} pages`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 p-1 mx-4 mt-4 bg-slate-100 rounded-xl max-w-md flex-shrink-0">
            <TabsTrigger value="preview" className="rounded-lg text-xs">
              Preview
            </TabsTrigger>
            <TabsTrigger value="edit" className="rounded-lg text-xs">
              Edit
            </TabsTrigger>
            <TabsTrigger value="ai-edit" className="rounded-lg text-xs">
              AI Edit
            </TabsTrigger>
            <TabsTrigger value="export" className="rounded-lg text-xs">
              Export
            </TabsTrigger>
          </TabsList>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 min-h-0 p-4 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-thin">
              {document.analysis && (
                <div className="mb-4 p-4 bg-violet-50 rounded-xl border border-violet-100">
                  <h4 className="font-medium text-violet-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Analysis
                  </h4>
                  <div className="text-sm text-violet-800 whitespace-pre-wrap">{document.analysis}</div>
                </div>
              )}
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans bg-slate-50 p-4 rounded-xl">
                  {editedContent}
                </pre>
              </div>
            </div>
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <Label className="text-sm font-medium text-slate-700">Document Content</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="rounded-xl bg-transparent">
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" onClick={handleSave} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="flex-1 min-h-0 font-mono text-sm resize-none rounded-xl"
              placeholder="Document content..."
            />
          </TabsContent>

          {/* AI Edit Tab */}
          <TabsContent value="ai-edit" className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
            <div className="space-y-4 flex-shrink-0">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  What changes would you like to make?
                </Label>
                <Textarea
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="e.g., Make the tone more formal, Add a section about remote work policy, Simplify the language..."
                  className="h-24 rounded-xl resize-none"
                />
              </div>
              <Button
                onClick={handleAiEdit}
                disabled={!aiInstruction.trim() || isProcessing}
                className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply AI Edit
                  </>
                )}
              </Button>
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-xl flex-1 min-h-0 overflow-hidden">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Quick Edit Suggestions</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "Make it more formal",
                  "Simplify the language",
                  "Add bullet points",
                  "Make it shorter",
                  "Add more details",
                  "Fix grammar and spelling",
                  "Add HR compliance language",
                  "Make it more employee-friendly",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setAiInstruction(suggestion)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* AI Result Tab */}
          <TabsContent value="ai-result" className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <Label className="text-sm font-medium text-slate-700">AI Edited Version</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("ai-edit")} className="rounded-xl">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Try Again
                </Button>
                <Button size="sm" onClick={applyAiEdit} className="rounded-xl bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-1" />
                  Apply Changes
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans bg-green-50 p-4 rounded-xl border border-green-200">
                {aiEditedContent}
              </pre>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 min-h-0 p-4 overflow-hidden">
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Export Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-full rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docx">Microsoft Word (.docx)</SelectItem>
                    <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                    <SelectItem value="csv">CSV Spreadsheet (.csv)</SelectItem>
                    <SelectItem value="xlsx">Excel Spreadsheet (.xlsx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h4 className="font-medium text-slate-900 mb-1">Document Info</h4>
                  <p className="text-sm text-slate-500">Words: {document.wordCount?.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Characters: {document.characterCount?.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h4 className="font-medium text-slate-900 mb-1">Export Settings</h4>
                  <p className="text-sm text-slate-500">Format: {exportFormat.toUpperCase()}</p>
                  <p className="text-sm text-slate-500">Encoding: UTF-8</p>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={isProcessing}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Document
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
