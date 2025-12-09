"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Send,
  Sparkles,
  Brain,
  Loader2,
  MessageCircle,
  Phone,
  Keyboard,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Files,
  Search,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"
import { ChatMessage } from "@/components/chat/chat-message"
import { QuickActions } from "@/components/chat/quick-actions"
import { FloatingPopup } from "@/components/ui/floating-popup"
import { VoiceConversation } from "@/components/voice/voice-conversation"

interface ToolCall {
  tool: "create_document" | "open_upload" | "run_workflow" | "query_documents" | "none"
  parameters?: {
    documentType?: string
    title?: string
    description?: string
    workflowType?: string
    query?: string
  }
}

interface CreatedDocument {
  id: string
  title: string
  type: string
  content: string
  createdAt: number
}

interface ChatPopupProps {
  isOpen: boolean
  onClose: () => void
  onOpenUpload?: () => void
  onOpenWorkflow?: (workflowType?: string) => void
  onOpenCreateDocument?: (params?: { documentType?: string; title?: string; description?: string }) => void
}

export function ChatPopup({ isOpen, onClose, onOpenUpload, onOpenWorkflow, onOpenCreateDocument }: ChatPopupProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("text")
  const [voiceTranscripts, setVoiceTranscripts] = useState<Array<{ text: string; isUser: boolean }>>([])
  const [createdDocuments, setCreatedDocuments] = useState<CreatedDocument[]>([])
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())
  const [lastSources, setLastSources] = useState<Array<{ id: string; name: string; type: string }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    addMessage,
    clearMessages,
    currentDocument,
    coreMemory,
    aiSettings,
    addAIActivity,
    updateAIActivity,
    addCreatedDocument,
    documents,
  } = useHRStore()

  const indexedDocuments = documents.filter((d) => d.isIndexedForChat && d.status === "ready")

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [isOpen, scrollToBottom])

  useEffect(() => {
    scrollToBottom()
  }, [messages, createdDocuments, scrollToBottom])

  const handleNewChat = useCallback(() => {
    clearMessages()
    setCreatedDocuments([])
    setExpandedDocs(new Set())
    setVoiceTranscripts([])
    setInput("")
    setLastSources([])
  }, [clearMessages])

  const handleClearChat = useCallback(() => {
    clearMessages()
    setVoiceTranscripts([])
    setLastSources([])
  }, [clearMessages])

  const handleToolCall = useCallback(
    async (toolCall: ToolCall) => {
      if (toolCall.tool === "create_document") {
        const activityId = `doc-${Date.now()}`
        const docType = toolCall.parameters?.documentType || "document"
        const docTitle = toolCall.parameters?.title || `New ${docType}`

        addAIActivity({
          id: activityId,
          type: "document",
          title: `Creating ${docType}`,
          description: "Initializing document creator...",
          status: "running",
          progress: 5,
          startedAt: Date.now(),
        })

        try {
          await new Promise((resolve) => setTimeout(resolve, 300))
          updateAIActivity(activityId, {
            progress: 15,
            description: "Gathering context from core memory...",
          })

          await new Promise((resolve) => setTimeout(resolve, 300))
          updateAIActivity(activityId, {
            progress: 25,
            description: `Analyzing requirements for ${docType}...`,
          })

          updateAIActivity(activityId, {
            progress: 35,
            description: "Generating document content with AI...",
          })

          const response = await fetch("/api/create-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentType: docType,
              title: docTitle,
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

          await new Promise((resolve) => setTimeout(resolve, 300))

          updateAIActivity(activityId, {
            progress: 95,
            description: "Finalizing document...",
          })

          const newDoc: CreatedDocument = {
            id: `created-${Date.now()}`,
            title: data.title || docTitle,
            type: data.documentType || docType,
            content: data.content,
            createdAt: Date.now(),
          }

          setCreatedDocuments((prev) => [newDoc, ...prev])
          setExpandedDocs((prev) => new Set([...prev, newDoc.id]))

          addCreatedDocument(newDoc)

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
            description: "Failed to create document - please try again",
          })
          addMessage({
            role: "assistant",
            content: "I'm sorry, I encountered an error creating the document. Please try again.",
          })
        }
      } else if (toolCall.tool === "open_upload") {
        const uploadActivityId = `upload-${Date.now()}`
        addAIActivity({
          id: uploadActivityId,
          type: "document",
          title: "Opening Document Upload",
          description: "Launching upload interface...",
          status: "running",
          progress: 50,
          startedAt: Date.now(),
        })
        onOpenUpload?.()
        setTimeout(() => {
          updateAIActivity(uploadActivityId, {
            status: "completed",
            progress: 100,
            description: "Upload panel opened",
            completedAt: Date.now(),
          })
        }, 500)
      } else if (toolCall.tool === "run_workflow") {
        const workflowId = `workflow-${Date.now()}`
        addAIActivity({
          id: workflowId,
          type: "workflow",
          title: "Starting Workflow",
          description: `Launching ${toolCall.parameters?.workflowType || "automation"} workflow...`,
          status: "running",
          progress: 50,
          startedAt: Date.now(),
        })
        onOpenWorkflow?.(toolCall.parameters?.workflowType)
        setTimeout(() => {
          updateAIActivity(workflowId, {
            status: "completed",
            progress: 100,
            description: "Workflow panel opened",
            completedAt: Date.now(),
          })
        }, 500)
      }
    },
    [
      addAIActivity,
      updateAIActivity,
      addMessage,
      coreMemory,
      aiSettings,
      onOpenUpload,
      onOpenWorkflow,
      addCreatedDocument,
    ],
  )

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    addMessage({ role: "user", content: userMessage })
    setIsLoading(true)
    setLastSources([])

    const chatActivityId = `chat-${Date.now()}`

    addAIActivity({
      id: chatActivityId,
      type: "analysis",
      title: "Processing Message",
      description: "Understanding your request...",
      status: "running",
      progress: 10,
      startedAt: Date.now(),
    })

    try {
      updateAIActivity(chatActivityId, {
        progress: 30,
        description:
          indexedDocuments.length > 0
            ? `Searching ${indexedDocuments.length} documents...`
            : "Analyzing intent and context...",
      })

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: currentDocument?.content || null,
          history: messages.slice(-10),
          coreMemory: coreMemory,
          aiSettings: aiSettings,
          uploadedDocuments: indexedDocuments.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            content: d.content,
            analysis: d.analysis,
          })),
        }),
      })

      updateAIActivity(chatActivityId, {
        progress: 70,
        description: "Generating response...",
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()

      if (data.sources && data.sources.length > 0) {
        setLastSources(data.sources)
      }

      if (data.toolCall && data.toolCall.tool !== "none" && data.toolCall.tool !== "query_documents") {
        updateAIActivity(chatActivityId, {
          progress: 90,
          description: `Executing action: ${data.toolCall.tool.replace("_", " ")}...`,
        })

        addMessage({ role: "assistant", content: data.response })

        updateAIActivity(chatActivityId, {
          status: "completed",
          progress: 100,
          description: "Request processed - executing action",
          completedAt: Date.now(),
        })

        await handleToolCall(data.toolCall)
      } else {
        addMessage({ role: "assistant", content: data.response })

        updateAIActivity(chatActivityId, {
          status: "completed",
          progress: 100,
          description:
            data.toolCall?.tool === "query_documents"
              ? `Found answers in ${data.sources?.length || 0} document(s)`
              : "Response generated",
          completedAt: Date.now(),
        })
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
      })

      updateAIActivity(chatActivityId, {
        status: "error",
        description: "Failed to process message",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  const handleVoiceTranscript = useCallback((text: string, isUser: boolean) => {
    setVoiceTranscripts((prev) => [...prev.slice(-20), { text, isUser }])
  }, [])

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

      const byteCharacters = atob(data.file)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: data.mimeType })

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
      addMessage({
        role: "assistant",
        content: `Sorry, I couldn't export the document. ${error instanceof Error ? error.message : "Please try again."}`,
      })
    }
  }

  return (
    <FloatingPopup
      isOpen={isOpen}
      onClose={onClose}
      title="AI Assistant"
      subtitle="Chat or speak with your HR assistant"
      icon={<MessageCircle className="w-5 h-5" />}
      defaultSize="large"
    >
      <div className="flex flex-col h-full min-h-[60vh]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 px-4 pt-2 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="text" className="gap-2">
                  <Keyboard className="w-4 h-4" />
                  Text Chat
                </TabsTrigger>
                <TabsTrigger value="voice" className="gap-2">
                  <Phone className="w-4 h-4" />
                  Voice Chat
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewChat}
                  className="h-8 px-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                  title="New Chat"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  disabled={messages.length === 0}
                  className="h-8 px-2 text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Clear Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value="text" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
            <div className="flex-shrink-0 p-4 border-b border-slate-100">
              <QuickActions onAction={handleQuickAction} />
            </div>

            <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
              {coreMemory.length > 0 && aiSettings.useCorememory && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 rounded-full">
                  <Brain className="w-3.5 h-3.5 text-violet-600" />
                  <span className="text-xs font-medium text-violet-700">{coreMemory.length} memories</span>
                </div>
              )}
              {indexedDocuments.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 rounded-full">
                  <Files className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">{indexedDocuments.length} documents indexed</span>
                </div>
              )}
              {indexedDocuments.length === 0 && coreMemory.length === 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-500">Upload documents to enable Q&A</span>
                </div>
              )}
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin">
              {messages.length === 0 && createdDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-2">Start a conversation</h3>
                  <p className="text-sm text-slate-500 max-w-sm mb-4">
                    Ask me to draft policies, summarize documents, create checklists, or help with any HR task.
                  </p>
                  {indexedDocuments.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 max-w-sm">
                      <p className="text-sm text-blue-700 font-medium mb-2">Documents Ready for Q&A</p>
                      <div className="space-y-1">
                        {indexedDocuments.slice(0, 3).map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 text-xs text-blue-600">
                            <FileText className="w-3 h-3" />
                            <span className="truncate">{doc.name}</span>
                          </div>
                        ))}
                        {indexedDocuments.length > 3 && (
                          <p className="text-xs text-blue-500">+{indexedDocuments.length - 3} more</p>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 mt-2">Try: "What does the handbook say about..."</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <ChatMessage key={index} message={message} />
                  ))}

                  {lastSources.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap gap-2 px-4 py-2"
                    >
                      <span className="text-xs text-slate-500">Sources:</span>
                      {lastSources.map((source) => (
                        <div
                          key={source.id}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md text-xs text-blue-700"
                        >
                          <FileText className="w-3 h-3" />
                          {source.name}
                        </div>
                      ))}
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {createdDocuments.map((doc) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl border border-blue-200/50 overflow-hidden"
                      >
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
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">
                            {indexedDocuments.length > 0 ? "Searching documents..." : "Thinking..."}
                          </span>
                          <span className="flex gap-1">
                            <span
                              className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex gap-3"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    indexedDocuments.length > 0 ? "Ask about your documents or request help..." : "Type your message..."
                  }
                  disabled={isLoading}
                  className="flex-1 h-12 rounded-xl border-slate-200 focus:border-blue-300 focus:ring-blue-200"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "h-12 w-12 rounded-xl transition-all",
                    input.trim()
                      ? "bg-gradient-to-br from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
                      : "bg-slate-100 text-slate-400",
                  )}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
            <VoiceConversation onTranscript={handleVoiceTranscript} onToolCall={handleToolCall} />
          </TabsContent>
        </Tabs>
      </div>
    </FloatingPopup>
  )
}
