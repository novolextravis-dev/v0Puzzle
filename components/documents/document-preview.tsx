"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, Copy, Check, FileText, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"

interface DocumentPreviewProps {
  isOpen: boolean
  onClose: () => void
}

export function DocumentPreview({ isOpen, onClose }: DocumentPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const { currentDocument, addMessage } = useHRStore()

  if (!currentDocument) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentDocument.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentDocument.content,
          fileName: currentDocument.name,
        }),
      })

      if (!response.ok) throw new Error("Failed to analyze")

      const data = await response.json()
      setAnalysis(data.analysis)

      // Add to chat history
      addMessage({
        role: "assistant",
        content: `I've analyzed "${currentDocument.name}":\n\n${data.analysis}`,
      })
    } catch (error) {
      setAnalysis("Unable to analyze document. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={cn("relative w-full max-w-3xl max-h-[80vh]", "bg-white rounded-3xl shadow-2xl overflow-hidden")}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{currentDocument.name}</h3>
                  <p className="text-xs text-slate-500">{currentDocument.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleCopy} className="rounded-xl">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <Tabs defaultValue="content" className="p-6">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-0">
                <div className="h-[400px] overflow-y-auto p-4 bg-slate-50 rounded-2xl">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">{currentDocument.content}</pre>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="mt-0">
                <div className="h-[400px] overflow-y-auto">
                  {!analysis && !isAnalyzing && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-medium text-slate-900 mb-2">AI Document Analysis</h4>
                      <p className="text-sm text-slate-500 mb-4 max-w-sm">
                        Get intelligent insights, key points, and recommendations for this document.
                      </p>
                      <Button
                        onClick={handleAnalyze}
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze Document
                      </Button>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                      <p className="text-sm text-slate-500">Analyzing document...</p>
                    </div>
                  )}

                  {analysis && (
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{analysis}</pre>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
