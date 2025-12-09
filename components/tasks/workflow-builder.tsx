"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Play,
  CheckCircle2,
  FileText,
  Users,
  Mail,
  ArrowRight,
  X,
  Settings2,
  Download,
  Copy,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  Calendar,
  Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"

interface WorkflowStep {
  id: string
  type: "document" | "email" | "task" | "approval"
  title: string
  status: "pending" | "active" | "complete" | "error"
  output?: string
  error?: string
}

interface WorkflowContext {
  companyName: string
  employeeName: string
  position: string
  department: string
  startDate: string
}

const stepTypes = [
  { value: "document", label: "Document Generation", icon: FileText, description: "Generate HR documents" },
  { value: "email", label: "Compose Email", icon: Mail, description: "Draft professional emails" },
  { value: "task", label: "Create Checklist", icon: CheckCircle2, description: "Generate task checklists" },
  { value: "approval", label: "Approval Request", icon: Users, description: "Create approval documents" },
]

const presetWorkflows = [
  {
    name: "New Employee Onboarding",
    description: "Complete onboarding workflow for new hires",
    steps: [
      { type: "document", title: "Prepare offer letter and employment contract" },
      { type: "email", title: "Send welcome email to new employee" },
      { type: "task", title: "IT setup checklist - workstation, accounts, access" },
      { type: "document", title: "Prepare I-9 and tax forms package" },
      { type: "task", title: "First week orientation schedule" },
      { type: "email", title: "Team introduction email" },
    ],
  },
  {
    name: "Performance Review Cycle",
    description: "Annual performance evaluation process",
    steps: [
      { type: "email", title: "Send review period notification to managers" },
      { type: "document", title: "Generate self-assessment questionnaire" },
      { type: "document", title: "Create manager evaluation form" },
      { type: "task", title: "Performance calibration meeting checklist" },
      { type: "approval", title: "Final ratings approval request" },
      { type: "email", title: "Review completion notification" },
    ],
  },
  {
    name: "Employee Offboarding",
    description: "Comprehensive exit process workflow",
    steps: [
      { type: "document", title: "Generate resignation acceptance letter" },
      { type: "task", title: "Exit interview preparation checklist" },
      { type: "document", title: "Create exit checklist and clearance form" },
      { type: "task", title: "Asset recovery and access revocation list" },
      { type: "document", title: "Generate experience letter and final settlement" },
      { type: "email", title: "Send farewell announcement to team" },
    ],
  },
  {
    name: "Policy Update Rollout",
    description: "Communicate and implement policy changes",
    steps: [
      { type: "document", title: "Draft policy change summary document" },
      { type: "approval", title: "Legal and compliance review request" },
      { type: "email", title: "All-hands policy update announcement" },
      { type: "document", title: "Generate FAQ document for employees" },
      { type: "task", title: "Training session planning checklist" },
    ],
  },
]

export function WorkflowBuilder() {
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [showContextForm, setShowContextForm] = useState(false)
  const [context, setContext] = useState<WorkflowContext>({
    companyName: "",
    employeeName: "",
    position: "",
    department: "",
    startDate: "",
  })

  const { addTask, updateTask, coreMemory, aiSettings } = useHRStore()

  const addStep = (type: string, title: string) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as WorkflowStep["type"],
      title,
      status: "pending",
    }
    setSteps([...steps, newStep])
  }

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id))
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const loadPreset = (preset: (typeof presetWorkflows)[0]) => {
    const workflowSteps: WorkflowStep[] = preset.steps.map((step, index) => ({
      id: `step-${Date.now()}-${index}`,
      type: step.type as WorkflowStep["type"],
      title: step.title,
      status: "pending",
    }))
    setSteps(workflowSteps)
    setExpandedSteps(new Set())
    setShowContextForm(true)
  }

  const toggleStepExpanded = (id: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const runWorkflow = useCallback(async () => {
    if (steps.length === 0) return

    setIsRunning(true)
    setShowContextForm(false)
    const outputs: Record<string, string> = {}

    for (let i = 0; i < steps.length; i++) {
      setCurrentStepIndex(i)
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "active" } : s)))

      const taskId = `task-${steps[i].id}`
      addTask({
        id: taskId,
        title: `Executing: ${steps[i].title}`,
        status: "in-progress",
        type: "workflow",
        progress: Math.round((i / steps.length) * 100),
      })

      try {
        const response = await fetch("/api/workflow-execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: steps[i],
            context: {
              ...context,
              companyName: context.companyName || aiSettings.companyName,
              coreMemory: coreMemory.map((m) => ({ summary: m.summary, content: m.content })),
              previousOutputs: outputs,
            },
            stepIndex: i,
            totalSteps: steps.length,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to execute step")
        }

        const data = await response.json()

        if (data.success) {
          outputs[steps[i].title] = data.output
          setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "complete", output: data.output } : s)))
          setExpandedSteps((prev) => new Set([...prev, steps[i].id]))
          updateTask(taskId, { status: "complete", title: `Completed: ${steps[i].title}` })
        } else {
          throw new Error(data.error || "Unknown error")
        }
      } catch (error) {
        setSteps((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "error", error: error instanceof Error ? error.message : "Failed" } : s,
          ),
        )
        updateTask(taskId, { status: "error", title: `Failed: ${steps[i].title}` })
      }
    }

    setIsRunning(false)
    setCurrentStepIndex(-1)
  }, [steps, context, coreMemory, aiSettings, addTask, updateTask])

  const retryStep = async (stepIndex: number) => {
    const step = steps[stepIndex]
    setSteps((prev) => prev.map((s, idx) => (idx === stepIndex ? { ...s, status: "active", error: undefined } : s)))

    try {
      const response = await fetch("/api/workflow-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step,
          context: {
            ...context,
            companyName: context.companyName || aiSettings.companyName,
            coreMemory: coreMemory.map((m) => ({ summary: m.summary, content: m.content })),
          },
          stepIndex,
          totalSteps: steps.length,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSteps((prev) =>
          prev.map((s, idx) => (idx === stepIndex ? { ...s, status: "complete", output: data.output } : s)),
        )
        setExpandedSteps((prev) => new Set([...prev, step.id]))
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === stepIndex ? { ...s, status: "error", error: error instanceof Error ? error.message : "Failed" } : s,
        ),
      )
    }
  }

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output)
  }

  const downloadOutput = (step: WorkflowStep) => {
    if (!step.output) return
    const blob = new Blob([step.output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${step.title.replace(/[^a-z0-9]/gi, "_")}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStepIcon = (type: string) => {
    const stepType = stepTypes.find((t) => t.value === type)
    return stepType?.icon || FileText
  }

  const completedSteps = steps.filter((s) => s.status === "complete").length
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Context Form */}
      <AnimatePresence>
        {showContextForm && steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Workflow Context (Optional)
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContextForm(false)}
                  className="h-8 text-blue-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-blue-700">
                Provide context to personalize the generated content. Leave blank for generic output.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-blue-800 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Company Name
                  </Label>
                  <Input
                    value={context.companyName}
                    onChange={(e) => setContext((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Acme Corporation"
                    className="h-9 bg-white border-blue-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-blue-800 flex items-center gap-1">
                    <User className="w-3 h-3" /> Employee Name
                  </Label>
                  <Input
                    value={context.employeeName}
                    onChange={(e) => setContext((prev) => ({ ...prev, employeeName: e.target.value }))}
                    placeholder="John Smith"
                    className="h-9 bg-white border-blue-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-blue-800 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Position
                  </Label>
                  <Input
                    value={context.position}
                    onChange={(e) => setContext((prev) => ({ ...prev, position: e.target.value }))}
                    placeholder="Software Engineer"
                    className="h-9 bg-white border-blue-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-blue-800 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Department
                  </Label>
                  <Input
                    value={context.department}
                    onChange={(e) => setContext((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="Engineering"
                    className="h-9 bg-white border-blue-200"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-blue-800 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Start Date
                  </Label>
                  <Input
                    type="date"
                    value={context.startDate}
                    onChange={(e) => setContext((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="h-9 bg-white border-blue-200"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset Workflows */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Quick Start Templates</h4>
        <div className="grid grid-cols-1 gap-3">
          {presetWorkflows.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              disabled={isRunning}
              className={cn(
                "p-4 rounded-2xl text-left",
                "bg-slate-50 border border-slate-200/50",
                "hover:bg-blue-50 hover:border-blue-200",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <p className="font-medium text-slate-900 text-sm">{preset.name}</p>
              <p className="text-xs text-slate-500 mt-1">{preset.description}</p>
              <p className="text-xs text-blue-600 mt-2">{preset.steps.length} automated steps</p>
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Steps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-medium text-slate-700">Workflow Steps</h4>
            {steps.length > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                {completedSteps} of {steps.length} completed
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {steps.length > 0 && !isRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContextForm(!showContextForm)}
                className="rounded-xl"
              >
                <Settings2 className="w-4 h-4 mr-1" />
                Context
              </Button>
            )}
            {steps.length > 0 && (
              <Button
                onClick={runWorkflow}
                disabled={isRunning || steps.every((s) => s.status === "complete")}
                size="sm"
                className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Workflow
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {steps.length > 0 && (
          <div className="mb-4">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {steps.map((step, index) => {
              const Icon = getStepIcon(step.type)
              const isExpanded = expandedSteps.has(step.id)

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    "rounded-2xl overflow-hidden",
                    "bg-white border border-slate-200/50",
                    step.status === "active" && "ring-2 ring-blue-500 border-blue-500",
                    step.status === "complete" && "bg-green-50 border-green-200",
                    step.status === "error" && "bg-red-50 border-red-200",
                  )}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-xs font-medium w-5">{index + 1}</span>
                      {index < steps.length - 1 && <ArrowRight className="w-3 h-3" />}
                    </div>

                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        step.status === "complete"
                          ? "bg-green-100"
                          : step.status === "active"
                            ? "bg-blue-100"
                            : step.status === "error"
                              ? "bg-red-100"
                              : "bg-slate-100",
                      )}
                    >
                      {step.status === "complete" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : step.status === "error" ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : step.status === "active" ? (
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5 text-slate-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{step.title}</p>
                      <p className="text-xs text-slate-500 capitalize">{step.type.replace("-", " ")}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      {step.status === "error" && !isRunning && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => retryStep(index)}
                          className="rounded-xl h-8 w-8 text-red-600 hover:bg-red-100"
                          title="Retry"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}

                      {step.output && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleStepExpanded(step.id)}
                            className="rounded-xl h-8 w-8"
                            title={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyOutput(step.output!)}
                            className="rounded-xl h-8 w-8"
                            title="Copy"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadOutput(step)}
                            className="rounded-xl h-8 w-8"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {!isRunning && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(step.id)}
                          className="rounded-xl h-8 w-8 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded output */}
                  <AnimatePresence>
                    {isExpanded && step.output && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <div className="p-4 bg-slate-50 rounded-xl max-h-64 overflow-y-auto scrollbar-thin">
                            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{step.output}</pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error message */}
                  {step.error && (
                    <div className="px-4 pb-4">
                      <div className="p-3 bg-red-100 rounded-xl">
                        <p className="text-sm text-red-700">{step.error}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Add Step */}
          {!isRunning && <AddStepForm onAdd={addStep} />}
        </div>
      </div>
    </div>
  )
}

function AddStepForm({ onAdd }: { onAdd: (type: string, title: string) => void }) {
  const [type, setType] = useState("")
  const [title, setTitle] = useState("")

  const handleAdd = () => {
    if (type && title.trim()) {
      onAdd(type, title.trim())
      setTitle("")
      setType("")
    }
  }

  const selectedType = stepTypes.find((t) => t.value === type)

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300">
      <div className="flex items-center gap-3">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-48 rounded-xl border-0 bg-white h-10">
            <SelectValue placeholder="Select step type" />
          </SelectTrigger>
          <SelectContent>
            {stepTypes.map((t) => {
              const Icon = t.icon
              return (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Describe what this step should do..."
          className="flex-1 rounded-xl border-0 bg-white h-10"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />

        <Button
          onClick={handleAdd}
          disabled={!type || !title.trim()}
          size="icon"
          className="rounded-xl bg-blue-500 hover:bg-blue-600 h-10 w-10"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {selectedType && <p className="text-xs text-slate-500 pl-1">{selectedType.description}</p>}
    </div>
  )
}
