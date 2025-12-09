"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { OrbCore } from "@/components/orb/orb-core"
import { FloatingNav } from "@/components/orb/floating-nav"
import { ChatInterface } from "@/components/chat/chat-interface"
import { Header } from "@/components/layout/header"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { LoginModal } from "@/components/auth/login-modal"
import { ChatPopup } from "@/components/chat/chat-popup"
import { DocumentPopup } from "@/components/documents/document-popup"
import { TaskPopup } from "@/components/tasks/task-popup"
import { CreateDocumentPopup } from "@/components/documents/create-document-popup"
import { FiledDocumentsPopup } from "@/components/documents/filed-documents-popup"
import { EmployeeConcernsPopup } from "@/components/concerns/employee-concerns-popup"
import { AIActivityTracker } from "@/components/ai/ai-activity-tracker"
import { AudioWaveformTrigger } from "@/components/voice/audio-waveform-trigger"
import { CreatedDocumentsPanel } from "@/components/documents/created-documents-panel"
import { useHRStore } from "@/lib/store"

export function HRAssistant() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isTasksOpen, setIsTasksOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isFiledOpen, setIsFiledOpen] = useState(false)
  const [isConcernsOpen, setIsConcernsOpen] = useState(false) // Add concerns state
  const [isOrbExpanded, setIsOrbExpanded] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [createDocParams, setCreateDocParams] = useState<{
    documentType?: string
    title?: string
    description?: string
  } | null>(null)
  const {
    isDraggingFile,
    setIsDraggingFile,
    isSettingsOpen,
    setIsSettingsOpen,
    currentUser,
    hasPermission,
    addMessage,
  } = useHRStore()

  const handleOrbClick = useCallback(() => {
    setIsOrbExpanded(!isOrbExpanded)
  }, [isOrbExpanded])

  const handleNavAction = useCallback(
    (action: string) => {
      if (action === "chat") {
        setIsChatOpen(true)
      } else if (action === "upload") {
        if (!currentUser || hasPermission("canUploadDocuments")) {
          setIsUploadOpen(true)
        }
      } else if (action === "tasks") {
        if (!currentUser || hasPermission("canRunWorkflows")) {
          setIsTasksOpen(true)
        }
      } else if (action === "create") {
        if (!currentUser || hasPermission("canUploadDocuments")) {
          setCreateDocParams(null)
          setIsCreateOpen(true)
        }
      } else if (action === "file") {
        setIsFiledOpen(true)
      } else if (action === "concerns") {
        setIsConcernsOpen(true)
      }
      setIsOrbExpanded(false)
    },
    [currentUser, hasPermission],
  )

  const handleVoiceTranscript = useCallback(
    (text: string, isUser: boolean) => {
      addMessage({
        role: isUser ? "user" : "assistant",
        content: text,
      })
    },
    [addMessage],
  )

  const handleToolCall = useCallback((toolCall: { tool: string; parameters?: Record<string, string> }) => {
    if (toolCall.tool === "create_document") {
      setCreateDocParams({
        documentType: toolCall.parameters?.documentType,
        title: toolCall.parameters?.title,
        description: toolCall.parameters?.description,
      })
      setIsCreateOpen(true)
    } else if (toolCall.tool === "open_upload") {
      setIsUploadOpen(true)
    } else if (toolCall.tool === "run_workflow") {
      setIsTasksOpen(true)
    }
  }, [])

  const handleOpenUpload = useCallback(() => {
    setIsUploadOpen(true)
  }, [])

  const handleOpenWorkflow = useCallback((workflowType?: string) => {
    setIsTasksOpen(true)
  }, [])

  const handleOpenCreateDocument = useCallback(
    (params?: { documentType?: string; title?: string; description?: string }) => {
      setCreateDocParams(params || null)
      setIsCreateOpen(true)
    },
    [],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(true)
    },
    [setIsDraggingFile],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(false)
    },
    [setIsDraggingFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(false)
      if (!currentUser || hasPermission("canUploadDocuments")) {
        setIsUploadOpen(true)
      }
    },
    [setIsDraggingFile, currentUser, hasPermission],
  )

  return (
    <div
      className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-200/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="sticky top-0 z-30">
        <Header onLoginClick={() => setIsLoginOpen(true)} />
      </div>

      <main className="relative flex flex-col items-center justify-start min-h-[calc(100vh-80px)] px-4 pt-32 pb-24">
        <motion.div
          className="relative flex flex-col items-center mt-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FloatingNav isExpanded={isOrbExpanded} onAction={handleNavAction} />
          <div className="relative">
            <AudioWaveformTrigger onTranscript={handleVoiceTranscript} onToolCall={handleToolCall} orbSize={288} />
            <OrbCore onClick={handleOrbClick} isExpanded={isOrbExpanded} isDragging={isDraggingFile} />
          </div>
          <ChatInterface
            minimal
            onOpenChat={() => setIsChatOpen(true)}
            onOpenCreateDocument={handleOpenCreateDocument}
            onOpenUpload={handleOpenUpload}
            onOpenWorkflow={handleOpenWorkflow}
          />
        </motion.div>
      </main>

      <ChatPopup
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpenUpload={handleOpenUpload}
        onOpenWorkflow={handleOpenWorkflow}
        onOpenCreateDocument={handleOpenCreateDocument}
      />
      <DocumentPopup isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      <TaskPopup isOpen={isTasksOpen} onClose={() => setIsTasksOpen(false)} />
      <CreateDocumentPopup
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setCreateDocParams(null)
        }}
        initialParams={createDocParams}
      />
      <FiledDocumentsPopup isOpen={isFiledOpen} onClose={() => setIsFiledOpen(false)} />
      <EmployeeConcernsPopup isOpen={isConcernsOpen} onClose={() => setIsConcernsOpen(false)} />

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <AIActivityTracker />

      {/* CreatedDocumentsPanel floating button */}
      <CreatedDocumentsPanel />

      <div className="h-8" aria-hidden="true" />
    </div>
  )
}
