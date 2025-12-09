import { create } from "zustand"
import { persist } from "zustand/middleware"

export type UserRole = "admin" | "hr_manager" | "hr_staff" | "employee"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department?: string
  avatar?: string
  createdAt: number
}

export interface RolePermissions {
  canUploadDocuments: boolean
  canDeleteDocuments: boolean
  canRunWorkflows: boolean
  canEditSettings: boolean
  canAccessCoreMemory: boolean
  canExportDocuments: boolean
  canViewAllDocuments: boolean
  canManageUsers: boolean
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canRunWorkflows: true,
    canEditSettings: true,
    canAccessCoreMemory: true,
    canExportDocuments: true,
    canViewAllDocuments: true,
    canManageUsers: true,
  },
  hr_manager: {
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canRunWorkflows: true,
    canEditSettings: true,
    canAccessCoreMemory: true,
    canExportDocuments: true,
    canViewAllDocuments: true,
    canManageUsers: false,
  },
  hr_staff: {
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canRunWorkflows: true,
    canEditSettings: false,
    canAccessCoreMemory: false,
    canExportDocuments: true,
    canViewAllDocuments: false,
    canManageUsers: false,
  },
  employee: {
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canRunWorkflows: false,
    canEditSettings: false,
    canAccessCoreMemory: false,
    canExportDocuments: false,
    canViewAllDocuments: false,
    canManageUsers: false,
  },
}

export interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: number
}

export interface Task {
  id: string
  title: string
  status: "pending" | "in-progress" | "complete" | "error"
  type: "document" | "ai" | "workflow"
  createdAt?: number
  progress?: number
}

export interface DocumentAnalysis {
  summary: string
  keyPoints: string[]
  actionItems: string[]
  entities: {
    people: string[]
    organizations: string[]
    dates: string[]
    amounts: string[]
    locations: string[]
  }
  topics: string[]
  sentiment: "positive" | "neutral" | "negative" | "mixed"
  confidenceScore: number
  suggestedQuestions: string[]
  relatedDocuments?: string[]
  complianceFlags?: string[]
  analyzedAt: number
}

export interface Document {
  id: string
  name: string
  type: string
  content: string
  preview?: string
  structuredData?: {
    metadata?: {
      title?: string
      author?: string
      slideCount?: number
      createdAt?: string
      modifiedAt?: string
    }
    slides?: Array<{
      slideNumber: number
      title: string
      subtitle?: string
      content: string[]
      tables?: Array<{ rows: string[][] }>
      notes?: string
    }>
  }
  metadata?: {
    fileName?: string
    fileType?: string
    size?: number
    processedAt?: string
    pageCount?: number
    sheetCount?: number
    slideCount?: number
    lineCount?: number
    presentationTitle?: string
    author?: string
    sheets?: Array<{ name: string; rowCount: number }>
    slides?: Array<{
      number: number
      title: string
      hasNotes: boolean
      contentLength: number
    }>
    [key: string]: unknown
  }
  characterCount?: number
  wordCount?: number
  status: "uploading" | "parsing" | "ready" | "analyzing" | "error"
  analysis?: DocumentAnalysis
  analysisText?: string // Legacy text-only analysis
  error?: string
  uploadedBy?: string
  isPrivate?: boolean
  isIndexedForChat: boolean
  lastIndexedAt?: number
}

export interface CoreMemoryItem {
  id: string
  name: string
  type: "document" | "text" | "spreadsheet"
  summary: string
  content: string
  keywords: string[]
  addedAt: number
  fileType?: string
  category?: "handbook" | "policy" | "employees" | "procedures" | "other"
}

export interface AISettings {
  modelPreference: "balanced" | "fast" | "thorough"
  responseLength: "concise" | "detailed" | "comprehensive"
  tone: "professional" | "friendly" | "formal"
  autoSummarize: boolean
  useCorememory: boolean
  companyName: string
  industry: string
  temperature: number
  topP: number
  maxTokens: number
  frequencyPenalty: number
  presencePenalty: number
  grokModel: "grok-4" | "grok-4-fast" | "grok-3" | "grok-3-mini"
  voiceEnabled: boolean
  voiceSpeed: number
  voiceAutoPlay: boolean
  sttModel: "whisper-large-v3" | "whisper-small"
}

export interface AIActivity {
  id: string
  type: "document" | "voice" | "workflow" | "analysis" | "other"
  title: string
  description: string
  status: "running" | "completed" | "error"
  progress?: number
  startedAt: number
  completedAt?: number
  result?: string
}

export interface CreatedDocument {
  id: string
  title: string
  type: string
  content: string
  createdAt: number
  format?: "docx" | "txt" | "xlsx" | "csv"
}

export interface FiledDocument {
  id: string
  name: string
  originalName: string
  content: string
  preview?: string
  category:
    | "contracts"
    | "resumes"
    | "policies"
    | "forms"
    | "correspondence"
    | "reports"
    | "payroll"
    | "benefits"
    | "training"
    | "performance"
    | "legal"
    | "other"
  subcategory?: string
  tags: string[]
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "reviewed" | "archived" | "action-required"
  summary: string
  extractedData?: {
    date?: string
    parties?: string[]
    amount?: string
    deadline?: string
    employeeName?: string
    department?: string
    [key: string]: unknown
  }
  filedAt: number
  receivedDate: string
  fileType: string
  fileSize: number
  notes?: string
  source?: "upload" | "email" | "scan"
  emailFrom?: string
  emailSubject?: string
}

export interface EmailFilingSettings {
  enabled: boolean
  filingEmail: string
  webhookSecret: string
  autoCategorizeViaEmail: boolean
  defaultCategory: FiledDocument["category"]
  notifyOnReceive: boolean
  allowedSenders: string[]
}

export interface EmployeeConcern {
  id: string
  employeeName: string
  employeeId?: string
  department?: string
  category:
    | "performance"
    | "conflict"
    | "policy"
    | "benefits"
    | "workplace"
    | "harassment"
    | "compensation"
    | "scheduling"
    | "training"
    | "other"
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "in-progress" | "pending-response" | "resolved" | "escalated"
  subject: string
  description: string
  notes: string[]
  actionsTaken: Array<{
    id: string
    action: string
    takenAt: number
    takenBy?: string
  }>
  followUpDate?: number
  resolvedAt?: number
  createdAt: number
  updatedAt: number
  isConfidential: boolean
  attachments?: string[]
}

interface HRStore {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  hasPermission: (permission: keyof RolePermissions) => boolean

  // Chat
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void

  documents: Document[]
  currentDocument: Document | null
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  removeDocument: (id: string) => void
  setCurrentDocument: (doc: Document | null) => void
  clearDocuments: () => void

  // Tasks
  tasks: Task[]
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void

  // UI State
  isDraggingFile: boolean
  setIsDraggingFile: (isDragging: boolean) => void
  processingQueue: string[]
  addToQueue: (id: string) => void
  removeFromQueue: (id: string) => void

  coreMemory: CoreMemoryItem[]
  addToCoreMemory: (item: CoreMemoryItem) => void
  removeFromCoreMemory: (id: string) => void
  updateCoreMemoryItem: (id: string, updates: Partial<CoreMemoryItem>) => void
  clearCoreMemory: () => void

  aiSettings: AISettings
  updateAISettings: (settings: Partial<AISettings>) => void
  resetAISettings: () => void

  isSettingsOpen: boolean
  setIsSettingsOpen: (isOpen: boolean) => void

  // AI Activity Tracking
  aiActivities: AIActivity[]
  addAIActivity: (activity: AIActivity) => void
  updateAIActivity: (id: string, updates: Partial<AIActivity>) => void
  removeAIActivity: (id: string) => void
  clearCompletedActivities: () => void

  // Created Documents
  createdDocuments: CreatedDocument[]
  addCreatedDocument: (doc: CreatedDocument) => void
  removeCreatedDocument: (id: string) => void
  clearCreatedDocuments: () => void

  // Filed Documents
  filedDocuments: FiledDocument[]
  addFiledDocument: (doc: FiledDocument) => void
  updateFiledDocument: (id: string, updates: Partial<FiledDocument>) => void
  removeFiledDocument: (id: string) => void
  clearFiledDocuments: () => void
  getFiledDocumentsByCategory: (category: FiledDocument["category"]) => FiledDocument[]
  getFiledDocumentsByDate: (date: string) => FiledDocument[]

  emailFilingSettings: EmailFilingSettings
  updateEmailFilingSettings: (settings: Partial<EmailFilingSettings>) => void
  generateFilingEmail: () => string

  // Document Query Methods
  getIndexedDocuments: () => Document[]
  setDocumentIndexed: (id: string, indexed: boolean) => void
  getDocumentById: (id: string) => Document | undefined
  searchDocuments: (query: string) => Document[]

  // Employee Concerns
  employeeConcerns: EmployeeConcern[]
  addEmployeeConcern: (concern: EmployeeConcern) => void
  updateEmployeeConcern: (id: string, updates: Partial<EmployeeConcern>) => void
  removeEmployeeConcern: (id: string) => void
  addConcernNote: (id: string, note: string) => void
  addConcernAction: (id: string, action: string) => void
  getConcernsByDate: (date: string) => EmployeeConcern[]
  getConcernsByStatus: (status: EmployeeConcern["status"]) => EmployeeConcern[]
  getConcernsByEmployee: (employeeName: string) => EmployeeConcern[]
}

const defaultAISettings: AISettings = {
  modelPreference: "balanced",
  responseLength: "detailed",
  tone: "professional",
  autoSummarize: true,
  useCorememory: true,
  companyName: "",
  industry: "",
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  frequencyPenalty: 0,
  presencePenalty: 0,
  grokModel: "grok-4",
  voiceEnabled: true,
  voiceSpeed: 1.0,
  voiceAutoPlay: true,
  sttModel: "whisper-large-v3",
}

const defaultEmailFilingSettings: EmailFilingSettings = {
  enabled: false,
  filingEmail: "",
  webhookSecret: "",
  autoCategorizeViaEmail: true,
  defaultCategory: "other",
  notifyOnReceive: true,
  allowedSenders: [],
}

export const useHRStore = create<HRStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      hasPermission: (permission) => {
        const { currentUser } = get()
        if (!currentUser) return false
        return rolePermissions[currentUser.role][permission]
      },

      // Chat
      messages: [],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, { ...message, timestamp: Date.now() }],
        })),
      clearMessages: () => set({ messages: [] }),

      documents: [],
      currentDocument: null,
      addDocument: (doc) =>
        set((state) => ({
          documents: [...state.documents, { ...doc, uploadedBy: state.currentUser?.id, isIndexedForChat: true }],
        })),
      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
          currentDocument:
            state.currentDocument?.id === id ? { ...state.currentDocument, ...updates } : state.currentDocument,
        })),
      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
          currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
        })),
      setCurrentDocument: (doc) => set({ currentDocument: doc }),
      clearDocuments: () => set({ documents: [], currentDocument: null }),

      // Tasks
      tasks: [],
      addTask: (task) =>
        set((state) => ({
          tasks: [{ ...task, createdAt: Date.now() }, ...state.tasks],
        })),
      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      // UI State
      isDraggingFile: false,
      setIsDraggingFile: (isDragging) => set({ isDraggingFile: isDragging }),
      processingQueue: [],
      addToQueue: (id) =>
        set((state) => ({
          processingQueue: [...state.processingQueue, id],
        })),
      removeFromQueue: (id) =>
        set((state) => ({
          processingQueue: state.processingQueue.filter((i) => i !== id),
        })),

      coreMemory: [],
      addToCoreMemory: (item) =>
        set((state) => ({
          coreMemory: [...state.coreMemory, item],
        })),
      removeFromCoreMemory: (id) =>
        set((state) => ({
          coreMemory: state.coreMemory.filter((m) => m.id !== id),
        })),
      updateCoreMemoryItem: (id, updates) =>
        set((state) => ({
          coreMemory: state.coreMemory.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      clearCoreMemory: () => set({ coreMemory: [] }),

      aiSettings: defaultAISettings,
      updateAISettings: (settings) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, ...settings },
        })),
      resetAISettings: () => set({ aiSettings: defaultAISettings }),

      isSettingsOpen: false,
      setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

      // AI Activity Tracking
      aiActivities: [],
      addAIActivity: (activity) =>
        set((state) => ({
          aiActivities: [activity, ...state.aiActivities].slice(0, 20), // Keep last 20
        })),
      updateAIActivity: (id, updates) =>
        set((state) => ({
          aiActivities: state.aiActivities.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      removeAIActivity: (id) =>
        set((state) => ({
          aiActivities: state.aiActivities.filter((a) => a.id !== id),
        })),
      clearCompletedActivities: () =>
        set((state) => ({
          aiActivities: state.aiActivities.filter((a) => a.status === "running"),
        })),

      // Created Documents
      createdDocuments: [],
      addCreatedDocument: (doc) =>
        set((state) => ({
          createdDocuments: [doc, ...state.createdDocuments].slice(0, 50), // Keep last 50
        })),
      removeCreatedDocument: (id) =>
        set((state) => ({
          createdDocuments: state.createdDocuments.filter((d) => d.id !== id),
        })),
      clearCreatedDocuments: () => set({ createdDocuments: [] }),

      // Filed Documents
      filedDocuments: [],
      addFiledDocument: (doc) =>
        set((state) => ({
          filedDocuments: [doc, ...state.filedDocuments],
        })),
      updateFiledDocument: (id, updates) =>
        set((state) => ({
          filedDocuments: state.filedDocuments.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),
      removeFiledDocument: (id) =>
        set((state) => ({
          filedDocuments: state.filedDocuments.filter((d) => d.id !== id),
        })),
      clearFiledDocuments: () => set({ filedDocuments: [] }),
      getFiledDocumentsByCategory: (category) => {
        return get().filedDocuments.filter((d) => d.category === category)
      },
      getFiledDocumentsByDate: (date) => {
        return get().filedDocuments.filter((d) => d.receivedDate === date)
      },

      emailFilingSettings: defaultEmailFilingSettings,
      updateEmailFilingSettings: (settings) =>
        set((state) => ({
          emailFilingSettings: { ...state.emailFilingSettings, ...settings },
        })),
      generateFilingEmail: () => {
        const randomId = Math.random().toString(36).substring(2, 10)
        const email = `file-${randomId}@hr-assistant.incoming.email`
        set((state) => ({
          emailFilingSettings: { ...state.emailFilingSettings, filingEmail: email },
        }))
        return email
      },

      // Document Query Methods
      getIndexedDocuments: () => {
        return get().documents.filter((d) => d.isIndexedForChat && d.status === "ready")
      },
      setDocumentIndexed: (id, indexed) =>
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, isIndexedForChat: indexed, lastIndexedAt: indexed ? Date.now() : undefined } : d,
          ),
        })),
      getDocumentById: (id) => {
        return get().documents.find((d) => d.id === id)
      },
      searchDocuments: (query) => {
        const lowerQuery = query.toLowerCase()
        return get().documents.filter(
          (d) =>
            d.status === "ready" &&
            (d.name.toLowerCase().includes(lowerQuery) ||
              d.content.toLowerCase().includes(lowerQuery) ||
              d.analysis?.topics?.some((t) => t.toLowerCase().includes(lowerQuery)) ||
              d.analysis?.keyPoints?.some((kp) => kp.toLowerCase().includes(lowerQuery))),
        )
      },

      // Employee Concerns
      employeeConcerns: [],
      addEmployeeConcern: (concern) =>
        set((state) => ({
          employeeConcerns: [concern, ...state.employeeConcerns],
        })),
      updateEmployeeConcern: (id, updates) =>
        set((state) => ({
          employeeConcerns: state.employeeConcerns.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c,
          ),
        })),
      removeEmployeeConcern: (id) =>
        set((state) => ({
          employeeConcerns: state.employeeConcerns.filter((c) => c.id !== id),
        })),
      addConcernNote: (id, note) =>
        set((state) => ({
          employeeConcerns: state.employeeConcerns.map((c) =>
            c.id === id ? { ...c, notes: [...c.notes, note], updatedAt: Date.now() } : c,
          ),
        })),
      addConcernAction: (id, action) =>
        set((state) => ({
          employeeConcerns: state.employeeConcerns.map((c) =>
            c.id === id
              ? {
                  ...c,
                  actionsTaken: [...c.actionsTaken, { id: `action-${Date.now()}`, action, takenAt: Date.now() }],
                  updatedAt: Date.now(),
                }
              : c,
          ),
        })),
      getConcernsByDate: (date) => {
        const targetDate = new Date(date).toDateString()
        return get().employeeConcerns.filter((c) => new Date(c.createdAt).toDateString() === targetDate)
      },
      getConcernsByStatus: (status) => {
        return get().employeeConcerns.filter((c) => c.status === status)
      },
      getConcernsByEmployee: (employeeName) => {
        return get().employeeConcerns.filter((c) => c.employeeName.toLowerCase().includes(employeeName.toLowerCase()))
      },
    }),
    {
      name: "hr-assistant-storage",
      partialize: (state) => ({
        messages: state.messages,
        tasks: state.tasks,
        documents: state.documents,
        coreMemory: state.coreMemory,
        aiSettings: state.aiSettings,
        currentUser: state.currentUser,
        createdDocuments: state.createdDocuments,
        filedDocuments: state.filedDocuments,
        emailFilingSettings: state.emailFilingSettings,
        employeeConcerns: state.employeeConcerns,
      }),
    },
  ),
)
