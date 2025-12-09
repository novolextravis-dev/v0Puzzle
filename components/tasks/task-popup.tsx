"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Clock, AlertCircle, FileText, Bot, ClipboardList, Workflow, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"
import { WorkflowBuilder } from "./workflow-builder"
import { FloatingPopup } from "@/components/ui/floating-popup"

interface TaskPopupProps {
  isOpen: boolean
  onClose: () => void
}

const taskTypeIcons = {
  document: FileText,
  ai: Bot,
  workflow: ClipboardList,
}

const statusConfig = {
  pending: { icon: Clock, color: "text-orange-500", bg: "bg-orange-100" },
  "in-progress": { icon: Clock, color: "text-blue-500", bg: "bg-blue-100" },
  complete: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100" },
  error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-100" },
}

export function TaskPopup({ isOpen, onClose }: TaskPopupProps) {
  const { tasks, removeTask } = useHRStore()
  const [activeTab, setActiveTab] = useState("tasks")

  const clearCompleted = () => {
    tasks.filter((t) => t.status === "complete").forEach((t) => removeTask(t.id))
  }

  return (
    <FloatingPopup
      isOpen={isOpen}
      onClose={onClose}
      title="Task Automation"
      subtitle="Manage your HR workflows"
      icon={<Settings2 className="w-5 h-5" />}
      defaultSize="large"
    >
      <div className="flex flex-col h-full min-h-[60vh]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <div className="px-4 md:px-6 pt-4 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-xl p-1">
              <TabsTrigger value="tasks" className="rounded-lg">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="workflows" className="rounded-lg">
                Workflows
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tasks" className="flex-1 min-h-0 mt-0 overflow-hidden">
            <div className="h-full overflow-y-auto px-4 md:px-6 py-4 space-y-3 scrollbar-thin">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <ClipboardList className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-2">No tasks yet</h3>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Upload documents or start a workflow to create automated tasks.
                  </p>
                </div>
              ) : (
                tasks.map((task) => {
                  const TypeIcon = taskTypeIcons[task.type as keyof typeof taskTypeIcons] || FileText
                  const status = statusConfig[task.status as keyof typeof statusConfig]
                  const StatusIcon = status.icon

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-3 md:p-4 rounded-xl",
                        "bg-slate-50/80 border border-slate-200/50",
                        "hover:bg-slate-100/80 transition-colors",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", status.bg)}>
                          <TypeIcon className={cn("w-4 h-4", status.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate text-sm">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusIcon className={cn("w-3 h-3", status.color)} />
                            <span className={cn("text-xs capitalize", status.color)}>
                              {task.status.replace("-", " ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="workflows" className="flex-1 min-h-0 mt-0 overflow-hidden">
            <div className="h-full overflow-y-auto px-4 md:px-6 py-4 scrollbar-thin">
              <WorkflowBuilder />
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 md:p-6 border-t border-slate-200/50 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="rounded-xl h-10 bg-white"
              onClick={clearCompleted}
              disabled={!tasks.some((t) => t.status === "complete")}
            >
              Clear Completed
            </Button>
            <Button
              className="rounded-xl h-10 bg-gradient-to-r from-blue-500 to-violet-500"
              onClick={() => setActiveTab("workflows")}
            >
              <Workflow className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
          </div>
        </div>
      </div>
    </FloatingPopup>
  )
}
