"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Mic,
  Workflow,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Minimize2,
  Maximize2,
  Search,
  Pencil,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"
import { Button } from "@/components/ui/button"

export function AIActivityTracker() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const { aiActivities, removeAIActivity, clearCompletedActivities } = useHRStore()

  const activeActivities = aiActivities.filter((a) => a.status === "running")
  const completedActivities = aiActivities.filter((a) => a.status !== "running")
  const hasActivities = aiActivities.length > 0

  if (!hasActivities) return null

  const getActivityIcon = (type: string, title?: string) => {
    // Check title for more specific icons
    if (title?.toLowerCase().includes("creating") || title?.toLowerCase().includes("document")) {
      return <Pencil className="w-4 h-4" />
    }
    if (title?.toLowerCase().includes("processing") || title?.toLowerCase().includes("message")) {
      return <MessageSquare className="w-4 h-4" />
    }

    switch (type) {
      case "document":
        return <FileText className="w-4 h-4" />
      case "voice":
        return <Mic className="w-4 h-4" />
      case "workflow":
        return <Workflow className="w-4 h-4" />
      case "analysis":
        return <Search className="w-4 h-4" />
      default:
        return <Sparkles className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getActivityColors = (type: string, status: string) => {
    if (status === "error") {
      return {
        bg: "bg-red-50",
        iconBg: "bg-red-100",
        iconText: "text-red-600",
        progressBg: "bg-red-500",
      }
    }
    if (status === "completed") {
      return {
        bg: "bg-green-50/50",
        iconBg: "bg-green-100",
        iconText: "text-green-600",
        progressBg: "bg-green-500",
      }
    }

    switch (type) {
      case "document":
        return {
          bg: "bg-violet-50/50",
          iconBg: "bg-violet-100",
          iconText: "text-violet-600",
          progressBg: "bg-gradient-to-r from-violet-500 to-purple-500",
        }
      case "workflow":
        return {
          bg: "bg-amber-50/50",
          iconBg: "bg-amber-100",
          iconText: "text-amber-600",
          progressBg: "bg-gradient-to-r from-amber-500 to-orange-500",
        }
      case "voice":
        return {
          bg: "bg-cyan-50/50",
          iconBg: "bg-cyan-100",
          iconText: "text-cyan-600",
          progressBg: "bg-gradient-to-r from-cyan-500 to-blue-500",
        }
      case "analysis":
        return {
          bg: "bg-blue-50/50",
          iconBg: "bg-blue-100",
          iconText: "text-blue-600",
          progressBg: "bg-gradient-to-r from-blue-500 to-indigo-500",
        }
      default:
        return {
          bg: "bg-slate-50/50",
          iconBg: "bg-slate-100",
          iconText: "text-slate-600",
          progressBg: "bg-blue-500",
        }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        height: isMinimized ? "auto" : "auto",
      }}
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "bg-white/95 backdrop-blur-xl",
        "rounded-2xl shadow-2xl shadow-black/10",
        "border border-slate-200/50",
        "overflow-hidden",
        isMinimized ? "w-auto" : "w-96",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          "bg-gradient-to-r from-blue-500/10 to-violet-500/10",
          "border-b border-slate-200/50",
          "cursor-pointer",
        )}
        onClick={() => !isMinimized && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="w-5 h-5 text-violet-600" />
            {activeActivities.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          {!isMinimized && (
            <span className="font-medium text-slate-900 text-sm">
              {activeActivities.length > 0
                ? `${activeActivities.length} task${activeActivities.length > 1 ? "s" : ""} in progress`
                : "AI Activity"}
            </span>
          )}
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
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {/* Active activities */}
              {activeActivities.length > 0 && (
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">In Progress</p>
                  {activeActivities.map((activity) => {
                    const colors = getActivityColors(activity.type, activity.status)
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn("flex items-start gap-3 p-3 rounded-xl", colors.bg)}
                      >
                        <div className={cn("p-2 rounded-lg", colors.iconBg, colors.iconText)}>
                          {getActivityIcon(activity.type, activity.title)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{activity.title}</p>
                          <motion.p
                            key={activity.description}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-slate-600 mt-0.5"
                          >
                            {activity.description}
                          </motion.p>
                          {activity.progress !== undefined && (
                            <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <motion.div
                                className={cn("h-full rounded-full", colors.progressBg)}
                                initial={{ width: 0 }}
                                animate={{ width: `${activity.progress}%` }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                              />
                            </div>
                          )}
                          {activity.progress !== undefined && (
                            <p className="text-[10px] text-slate-400 mt-1">{activity.progress}% complete</p>
                          )}
                        </div>
                        {getStatusIcon(activity.status)}
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Completed activities */}
              {completedActivities.length > 0 && (
                <div className="p-3 space-y-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Recent ({completedActivities.length})
                    </p>
                    <button
                      onClick={clearCompletedActivities}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  {completedActivities.slice(0, 5).map((activity) => {
                    const colors = getActivityColors(activity.type, activity.status)
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 p-2.5 bg-slate-50/80 rounded-xl group hover:bg-slate-100/80 transition-colors"
                      >
                        <div className={cn("p-1.5 rounded-lg", colors.iconBg, colors.iconText)}>
                          {getActivityIcon(activity.type, activity.title)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-slate-500 truncate">{activity.description}</p>
                        </div>
                        {getStatusIcon(activity.status)}
                        <button
                          onClick={() => removeAIActivity(activity.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                        >
                          <X className="w-3 h-3 text-slate-400" />
                        </button>
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
