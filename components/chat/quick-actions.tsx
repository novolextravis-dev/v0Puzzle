"use client"

import { motion } from "framer-motion"
import { FileText, ClipboardList, Users, FileCheck, Mail, Shield, TrendingUp, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"

interface QuickActionsProps {
  onAction: (prompt: string) => void
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const { currentDocument, coreMemory } = useHRStore()

  const baseActions = [
    {
      icon: FileText,
      label: "Summarize Document",
      prompt: "Please summarize the uploaded document, highlighting key points and action items.",
      requiresDocument: true,
    },
    {
      icon: ClipboardList,
      label: "Generate Policy",
      prompt: "Help me draft an HR policy. What type of policy would you like to create?",
      requiresDocument: false,
    },
    {
      icon: Users,
      label: "Onboarding Checklist",
      prompt: "Create a comprehensive onboarding checklist for a new employee.",
      requiresDocument: false,
    },
    {
      icon: FileCheck,
      label: "Review Document",
      prompt: "Please review the uploaded document for compliance and suggest improvements.",
      requiresDocument: true,
    },
    {
      icon: Mail,
      label: "Draft Email",
      prompt: "Help me draft a professional HR email. What is the purpose of the email?",
      requiresDocument: false,
    },
    {
      icon: Shield,
      label: "Compliance Check",
      prompt: "Review my HR documents and policies for compliance issues and potential risks.",
      requiresDocument: false,
    },
    {
      icon: TrendingUp,
      label: "Performance Review",
      prompt: "Help me create a performance review template with evaluation criteria and feedback sections.",
      requiresDocument: false,
    },
    {
      icon: HelpCircle,
      label: "HR Question",
      prompt: "I have an HR question: ",
      requiresDocument: false,
    },
  ]

  // Filter and enhance actions based on context
  const actions = baseActions.map((action) => {
    if (action.requiresDocument && !currentDocument) {
      return {
        ...action,
        label: action.label + " (upload first)",
        disabled: true,
      }
    }
    return { ...action, disabled: false }
  })

  // Add memory-specific actions if core memory exists
  const memoryActions =
    coreMemory.length > 0
      ? [
          {
            icon: FileText,
            label: "Search Knowledge Base",
            prompt: "Based on the documents in your memory, please help me find information about: ",
            disabled: false,
          },
        ]
      : []

  const allActions = [...actions.slice(0, 4), ...memoryActions, ...actions.slice(4, 6)]

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {allActions.map((action, index) => {
        const Icon = action.icon
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !action.disabled && onAction(action.prompt)}
            disabled={action.disabled}
            className={cn(
              "flex items-center gap-2 px-4 py-2",
              "bg-white/80 backdrop-blur-sm",
              "border border-slate-200/50",
              "rounded-xl text-sm font-medium text-slate-700",
              "transition-all duration-200",
              "shadow-sm",
              action.disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700",
            )}
          >
            <Icon className="w-4 h-4" />
            {action.label}
          </motion.button>
        )
      })}
    </div>
  )
}
