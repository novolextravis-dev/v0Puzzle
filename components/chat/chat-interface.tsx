"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Send, Sparkles, Brain, Loader2, FileText, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"
import { ChatMessage } from "@/components/chat/chat-message"
import { QuickActions } from "@/components/chat/quick-actions"

interface ToolCall {
  tool: "create_document" | "open_upload" | "run_workflow" | "none"
  parameters?: {
    documentType?: string
    title?: string
    description?: string
    workflowType?: string
  }
}

interface CreatedDocument {
  id: string
  title: string
  type: string
  content: string
  createdAt: number
}

interface ChatInterfaceProps {
  minimal?: boolean
  onBack?: () => void
  onOpenChat?: () => void
  onOpenCreateDocument?: (params?: { documentType?: string; title?: string; description?: string }) => void
  onOpenUpload?: () => void
  onOpenWorkflow?: (workflowType?: string) => void
}

export function ChatInterface({
  minimal,
  onBack,
  onOpenChat,
  onOpenCreateDocument,
  onOpenUpload,
  onOpenWorkflow,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [createdDocuments, setCreatedDocuments] = useState<CreatedDocument[]>([])
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, addMessage, currentDocument, coreMemory, aiSettings, addAIActivity, updateAIActivity } =
    useHRStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, createdDocuments])

  const handleToolCall = useCallback(
    async (toolCall: ToolCall) => {
      if (toolCall.tool === "create_document") {
        // Create a unique activity ID
        const activityId = `doc-${Date.now()}`

        addAIActivity({
          id: activityId,
          type: "document",
          title: `Creating ${toolCall.parameters?.documentType || "document"}`,
          description: "Initializing document creator...",
          status: "running",
          progress: 5,
          startedAt: Date.now(),
        })

        try {
          updateAIActivity(activityId, {
            progress: 15,
            description: "Gathering context from core memory...",
          })

          updateAIActivity(activityId, {
            progress: 25,
            description: `Analyzing requirements...`,
          })

          updateAIActivity(activityId, {
            progress: 35,
            description: "Generating document content with AI...",
          })

          // Actually create the document using the create-document API
          const response = await fetch("/api/create-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentType: toolCall.parameters?.documentType || "policy",
              title: toolCall.parameters?.title || `New ${toolCall.parameters?.documentType || "Document"}`,
              description: toolCall.parameters?.description || "",
              coreMemory: coreMemory,
              aiSettings: aiSettings,
            }),
          })

          updateAIActivity(activityId, {
            progress: 65,
            description: "Processing AI response...",
          })

          if (!response.ok) throw new Error("Failed to create document")

          const data = await response.json()

          updateAIActivity(activityId, {
            progress: 80,
            description: "Formatting and styling document...",
          })

          // Add to created documents list
          const newDoc: CreatedDocument = {
            id: `created-${Date.now()}`,
            title: data.title || toolCall.parameters?.title || "Untitled Document",
            type: data.documentType || toolCall.parameters?.documentType || "document",
            content: data.content,
            createdAt: Date.now(),
          }

          setCreatedDocuments((prev) => [newDoc, ...prev])
          setExpandedDocs((prev) => new Set([...prev, newDoc.id]))

          // Add success message
          addMessage({
            role: "assistant",
            content: `I've created your ${newDoc.type} document: "${newDoc.title}". You can preview it below, edit it, or download it in various formats.`,
          })

          updateAIActivity(activityId, {
            status: "completed",
            progress: 100,
            description: `"${newDoc.title}" ready to download`,
            completedAt: Date.now(),
          })
        } catch (error) {
          console.error("Document creation error:", error)
          updateAIActivity(activityId, {
            status: "error",
            description: "Failed to create document",
          })
          addMessage({
            role: "assistant",
            content: "I'm sorry, I encountered an error creating the document. Please try again.",
          })
        }
      } else if (toolCall.tool === "open_upload") {
        onOpenUpload?.()
      } else if (toolCall.tool === "run_workflow") {
        onOpenWorkflow?.(toolCall.parameters?.workflowType)
      }
    },
    [addAIActivity, updateAIActivity, addMessage, coreMemory, aiSettings, onOpenUpload, onOpenWorkflow],
  )

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    addMessage({ role: "user", content: userMessage })
    setIsLoading(true)

    if (minimal && onOpenChat) {
      onOpenChat()
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: currentDocument?.content || null,
          history: messages.slice(-10),
          coreMemory: coreMemory,
          aiSettings: aiSettings,
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()

      if (data.toolCall && data.toolCall.tool !== "none") {
        addMessage({ role: "assistant", content: data.response })
        // Execute the tool call
        await handleToolCall(data.toolCall)
      } else {
        addMessage({ role: "assistant", content: data.response })
      }
    } catch (error) {
      addMessage({
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  const toggleDocExpanded = (id: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const exportDocument = async (doc: CreatedDocument, format: "docx" | "txt") => {
    try {
      const response = await fetch("/api/export-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: doc.content,
          fileName: doc.title.replace(/[^a-zA-Z0-9\s-]/g, "").trim(),
          format,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Export failed")
      }

      const data = await response.json()

      if (!data.success || !data.file) {
        throw new Error("Invalid response from export API")
      }

      // Convert base64 to blob
      const byteCharacters = atob(data.file)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: data.mimeType })

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.fileName || `${doc.title}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export error:", error)
      // Show error to user
      addMessage({
        role: "assistant",
        content: `Sorry, I couldn't export the document. ${error instanceof Error ? error.message : "Please try again."}`,
      })
    }
  }

  if (minimal) {
    return (
      <motion.div
        className="w-full max-w-xl mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {coreMemory.length > 0 && aiSettings.useCorememory && (
          <div className="flex items-center justify-center gap-2 mb-4 text-xs text-violet-600">
            <Brain className="w-3 h-3" />
            <span>{coreMemory.length} memories active</span>
          </div>
        )}

        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message or click the ring to speak..."
            className={cn(
              "w-full h-12 pl-5 pr-14",
              "bg-white/60 backdrop-blur-sm",
              "border-slate-200/50 shadow-md shadow-black/5",
              "rounded-xl",
              "text-sm placeholder:text-slate-400",
              "focus:ring-2 focus:ring-blue-500/20",
            )}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-blue-100"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-slate-600" />
            )}
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="w-full max-w-3xl mx-auto max-h-[calc(100vh-120px)] flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-900">AI Chat</h2>
          <p className="text-sm text-slate-500">Ask me anything about HR tasks</p>
        </div>
        {coreMemory.length > 0 && aiSettings.useCorememory && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm">
            <Brain className="w-4 h-4" />
            <span>{coreMemory.length} memories</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0">
        <QuickActions onAction={handleQuickAction} />
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-black/5 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Start a conversation</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Ask me to draft policies, summarize documents, create checklists, or help with any HR task.
              </p>
              {coreMemory.length > 0 && (
                <p className="text-xs text-violet-600 mt-3">
                  I have access to {coreMemory.length} document{coreMemory.length > 1 ? "s" : ""} in my memory.
                </p>
              )}
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}

              <AnimatePresence>
                {createdDocuments.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl border border-blue-200/50 overflow-hidden"
                  >
                    {/* Document Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/50 transition-colors"
                      onClick={() => toggleDocExpanded(doc.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">{doc.title}</h4>
                          <p className="text-xs text-slate-500 capitalize">{doc.type} Document</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            exportDocument(doc, "docx")
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          DOCX
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            exportDocument(doc, "txt")
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          TXT
                        </Button>
                        {expandedDocs.has(doc.id) ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Document Preview */}
                    <AnimatePresence>
                      {expandedDocs.has(doc.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-blue-200/50 p-4 bg-white/50">
                            <div className="max-h-96 overflow-y-auto scrollbar-thin">
                              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                                {doc.content}
                              </pre>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200/50 p-4 flex-shrink-0">
          <div className="relative flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 h-12 bg-slate-50 border-0 rounded-xl text-base"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
