"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  FileText,
  MoreHorizontal,
  Edit3,
  Trash2,
  Flag,
  Users,
  Shield,
  ArrowUpRight,
  ListTodo,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useHRStore, type EmployeeConcern } from "@/lib/store"

interface EmployeeConcernsPopupProps {
  isOpen: boolean
  onClose: () => void
}

const categoryConfig: Record<EmployeeConcern["category"], { label: string; color: string; icon: React.ReactNode }> = {
  performance: {
    label: "Performance",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: <ArrowUpRight className="w-3 h-3" />,
  },
  conflict: {
    label: "Conflict",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: <Users className="w-3 h-3" />,
  },
  policy: {
    label: "Policy",
    color: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    icon: <FileText className="w-3 h-3" />,
  },
  benefits: {
    label: "Benefits",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: <Shield className="w-3 h-3" />,
  },
  workplace: {
    label: "Workplace",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    icon: <Users className="w-3 h-3" />,
  },
  harassment: {
    label: "Harassment",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  compensation: {
    label: "Compensation",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: <Flag className="w-3 h-3" />,
  },
  scheduling: {
    label: "Scheduling",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    icon: <Calendar className="w-3 h-3" />,
  },
  training: {
    label: "Training",
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    icon: <ListTodo className="w-3 h-3" />,
  },
  other: {
    label: "Other",
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    icon: <MoreHorizontal className="w-3 h-3" />,
  },
}

const priorityConfig: Record<EmployeeConcern["priority"], { label: string; color: string }> = {
  low: { label: "Low", color: "bg-slate-500/20 text-slate-400" },
  medium: { label: "Medium", color: "bg-yellow-500/20 text-yellow-400" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400" },
  urgent: { label: "Urgent", color: "bg-red-500/20 text-red-400" },
}

const statusConfig: Record<EmployeeConcern["status"], { label: string; color: string }> = {
  open: { label: "Open", color: "bg-blue-500/20 text-blue-400" },
  "in-progress": { label: "In Progress", color: "bg-amber-500/20 text-amber-400" },
  "pending-response": { label: "Pending Response", color: "bg-purple-500/20 text-purple-400" },
  resolved: { label: "Resolved", color: "bg-emerald-500/20 text-emerald-400" },
  escalated: { label: "Escalated", color: "bg-red-500/20 text-red-400" },
}

export function EmployeeConcernsPopup({ isOpen, onClose }: EmployeeConcernsPopupProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [view, setView] = useState<"calendar" | "list">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isAddingConcern, setIsAddingConcern] = useState(false)
  const [selectedConcern, setSelectedConcern] = useState<EmployeeConcern | null>(null)
  const [newNote, setNewNote] = useState("")
  const [newAction, setNewAction] = useState("")

  // New concern form state
  const [newConcern, setNewConcern] = useState({
    employeeName: "",
    employeeId: "",
    department: "",
    category: "other" as EmployeeConcern["category"],
    priority: "medium" as EmployeeConcern["priority"],
    subject: "",
    description: "",
    isConfidential: false,
    followUpDate: "",
  })

  const {
    employeeConcerns,
    addEmployeeConcern,
    updateEmployeeConcern,
    removeEmployeeConcern,
    addConcernNote,
    addConcernAction,
  } = useHRStore()

  // Filter concerns
  const filteredConcerns = useMemo(() => {
    return employeeConcerns.filter((concern) => {
      const matchesSearch =
        searchQuery === "" ||
        concern.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concern.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concern.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = filterStatus === "all" || concern.status === filterStatus
      const matchesCategory = filterCategory === "all" || concern.category === filterCategory
      const matchesPriority = filterPriority === "all" || concern.priority === filterPriority

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority
    })
  }, [employeeConcerns, searchQuery, filterStatus, filterCategory, filterPriority])

  // Get concerns for selected date (calendar view)
  const concernsForDate = useMemo(() => {
    const dateStr = selectedDate.toDateString()
    return employeeConcerns.filter((c) => new Date(c.createdAt).toDateString() === dateStr)
  }, [employeeConcerns, selectedDate])

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const todayConcerns = employeeConcerns.filter((c) => new Date(c.createdAt).toDateString() === today)
    const openConcerns = employeeConcerns.filter((c) => c.status === "open" || c.status === "in-progress")
    const urgentConcerns = employeeConcerns.filter((c) => c.priority === "urgent" && c.status !== "resolved")
    const pendingFollowUp = employeeConcerns.filter(
      (c) => c.followUpDate && c.followUpDate <= Date.now() && c.status !== "resolved",
    )

    return {
      today: todayConcerns.length,
      open: openConcerns.length,
      urgent: urgentConcerns.length,
      pendingFollowUp: pendingFollowUp.length,
    }
  }, [employeeConcerns])

  // Calendar helpers
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay()

  const handleAddConcern = () => {
    if (!newConcern.employeeName || !newConcern.subject) return

    const concern: EmployeeConcern = {
      id: `concern-${Date.now()}`,
      employeeName: newConcern.employeeName,
      employeeId: newConcern.employeeId || undefined,
      department: newConcern.department || undefined,
      category: newConcern.category,
      priority: newConcern.priority,
      status: "open",
      subject: newConcern.subject,
      description: newConcern.description,
      notes: [],
      actionsTaken: [],
      followUpDate: newConcern.followUpDate ? new Date(newConcern.followUpDate).getTime() : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isConfidential: newConcern.isConfidential,
    }

    addEmployeeConcern(concern)
    setNewConcern({
      employeeName: "",
      employeeId: "",
      department: "",
      category: "other",
      priority: "medium",
      subject: "",
      description: "",
      isConfidential: false,
      followUpDate: "",
    })
    setIsAddingConcern(false)
  }

  const handleAddNote = () => {
    if (!selectedConcern || !newNote.trim()) return
    addConcernNote(selectedConcern.id, newNote)
    setNewNote("")
    setSelectedConcern({
      ...selectedConcern,
      notes: [...selectedConcern.notes, newNote],
    })
  }

  const handleAddAction = () => {
    if (!selectedConcern || !newAction.trim()) return
    addConcernAction(selectedConcern.id, newAction)
    setNewAction("")
    setSelectedConcern({
      ...selectedConcern,
      actionsTaken: [
        ...selectedConcern.actionsTaken,
        { id: `action-${Date.now()}`, action: newAction, takenAt: Date.now() },
      ],
    })
  }

  const getConcernsCountForDay = (day: number) => {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day)
    return employeeConcerns.filter((c) => new Date(c.createdAt).toDateString() === date.toDateString()).length
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={cn(
            "relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col",
            isFullscreen ? "w-full h-full m-0 rounded-none" : "w-full max-w-6xl h-[85vh]",
          )}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Employee Concerns</h2>
                <p className="text-xs text-white/50">Track and manage employee issues</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-black/30 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("list")}
                  className={cn(
                    "h-8 px-3 rounded-md",
                    view === "list" ? "bg-white/10 text-white" : "text-white/50 hover:text-white",
                  )}
                >
                  <ListTodo className="w-4 h-4 mr-1.5" />
                  List
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("calendar")}
                  className={cn(
                    "h-8 px-3 rounded-md",
                    view === "calendar" ? "bg-white/10 text-white" : "text-white/50 hover:text-white",
                  )}
                >
                  <CalendarDays className="w-4 h-4 mr-1.5" />
                  Calendar
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 text-white/70 hover:text-white"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3 p-4 border-b border-white/10 bg-black/10">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400">Today</span>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{stats.today}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-400">Open</span>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{stats.open}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-400">Urgent</span>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{stats.urgent}</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400">Follow-up Due</span>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{stats.pendingFollowUp}</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Side - List or Calendar */}
            <div className="flex-1 flex flex-col border-r border-white/10">
              {/* Toolbar */}
              <div className="p-4 border-b border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      placeholder="Search concerns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-black/30 border-white/10 text-white placeholder:text-white/40"
                    />
                  </div>
                  <Button
                    onClick={() => setIsAddingConcern(true)}
                    className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Concern
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-white/40" />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px] h-8 bg-black/30 border-white/10 text-white text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(statusConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[140px] h-8 bg-black/30 border-white/10 text-white text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(categoryConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-[130px] h-8 bg-black/30 border-white/10 text-white text-xs">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {Object.entries(priorityConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Content Area */}
              <ScrollArea className="flex-1">
                {view === "list" ? (
                  // List View
                  <div className="p-4 space-y-3">
                    {filteredConcerns.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/50">No concerns found</p>
                        <p className="text-white/30 text-sm">Click "New Concern" to add one</p>
                      </div>
                    ) : (
                      filteredConcerns.map((concern) => (
                        <motion.div
                          key={concern.id}
                          className={cn(
                            "bg-black/30 border rounded-xl p-4 cursor-pointer transition-all",
                            selectedConcern?.id === concern.id
                              ? "border-rose-500/50 bg-rose-500/5"
                              : "border-white/10 hover:border-white/20",
                          )}
                          onClick={() => setSelectedConcern(concern)}
                          whileHover={{ scale: 1.01 }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-white/50" />
                                <span className="text-sm font-medium text-white">{concern.employeeName}</span>
                                {concern.department && (
                                  <span className="text-xs text-white/40">• {concern.department}</span>
                                )}
                                {concern.isConfidential && (
                                  <Badge variant="outline" className="text-[10px] border-red-500/50 text-red-400">
                                    Confidential
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-white font-medium truncate">{concern.subject}</h3>
                              <p className="text-white/50 text-sm line-clamp-2 mt-1">{concern.description}</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedConcern(concern)}>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-400"
                                  onClick={() => removeEmployeeConcern(concern.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex items-center gap-2 mt-3">
                            <Badge className={cn("text-[10px]", categoryConfig[concern.category].color)}>
                              {categoryConfig[concern.category].icon}
                              <span className="ml-1">{categoryConfig[concern.category].label}</span>
                            </Badge>
                            <Badge className={cn("text-[10px]", priorityConfig[concern.priority].color)}>
                              {priorityConfig[concern.priority].label}
                            </Badge>
                            <Badge className={cn("text-[10px]", statusConfig[concern.status].color)}>
                              {statusConfig[concern.status].label}
                            </Badge>
                            <span className="text-[10px] text-white/30 ml-auto">
                              {new Date(concern.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                ) : (
                  // Calendar View
                  <div className="p-4">
                    {/* Calendar Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))
                        }
                        className="text-white/70"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <h3 className="text-white font-medium">
                        {selectedDate.toLocaleString("default", { month: "long", year: "numeric" })}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))
                        }
                        className="text-white/70"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="text-center text-xs text-white/40 py-2">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const count = getConcernsCountForDay(day)
                        const isSelected =
                          selectedDate.getDate() === day && selectedDate.getMonth() === new Date().getMonth()
                        const isToday =
                          new Date().getDate() === day &&
                          new Date().getMonth() === selectedDate.getMonth() &&
                          new Date().getFullYear() === selectedDate.getFullYear()

                        return (
                          <button
                            key={day}
                            onClick={() =>
                              setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))
                            }
                            className={cn(
                              "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all",
                              isToday && "ring-2 ring-rose-500/50",
                              isSelected ? "bg-rose-500 text-white" : "text-white/70 hover:bg-white/10",
                              count > 0 && !isSelected && "bg-rose-500/20",
                            )}
                          >
                            <span>{day}</span>
                            {count > 0 && <span className="text-[10px] text-rose-400">{count}</span>}
                          </button>
                        )
                      })}
                    </div>

                    {/* Concerns for Selected Date */}
                    <div className="mt-6">
                      <h4 className="text-white/70 text-sm mb-3">Concerns on {selectedDate.toLocaleDateString()}</h4>
                      {concernsForDate.length === 0 ? (
                        <p className="text-white/40 text-sm">No concerns on this date</p>
                      ) : (
                        <div className="space-y-2">
                          {concernsForDate.map((concern) => (
                            <div
                              key={concern.id}
                              className="bg-black/30 border border-white/10 rounded-lg p-3 cursor-pointer hover:border-white/20"
                              onClick={() => setSelectedConcern(concern)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-white text-sm font-medium">{concern.subject}</span>
                                <Badge className={cn("text-[10px]", priorityConfig[concern.priority].color)}>
                                  {concern.priority}
                                </Badge>
                              </div>
                              <p className="text-white/50 text-xs mt-1">{concern.employeeName}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Right Side - Detail Panel */}
            <div className="w-96 flex flex-col bg-black/20">
              {selectedConcern ? (
                <>
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">Concern Details</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedConcern(null)}
                        className="text-white/50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Status Update */}
                    <Select
                      value={selectedConcern.status}
                      onValueChange={(value) => {
                        updateEmployeeConcern(selectedConcern.id, {
                          status: value as EmployeeConcern["status"],
                          resolvedAt: value === "resolved" ? Date.now() : undefined,
                        })
                        setSelectedConcern({
                          ...selectedConcern,
                          status: value as EmployeeConcern["status"],
                        })
                      }}
                    >
                      <SelectTrigger className="bg-black/30 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {/* Employee Info */}
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{selectedConcern.employeeName}</p>
                            {selectedConcern.department && (
                              <p className="text-white/50 text-xs">{selectedConcern.department}</p>
                            )}
                          </div>
                        </div>
                        <h4 className="text-white font-medium">{selectedConcern.subject}</h4>
                        <p className="text-white/60 text-sm mt-2">{selectedConcern.description}</p>
                      </div>

                      {/* Notes */}
                      <div>
                        <h4 className="text-white/70 text-sm font-medium mb-2">Notes</h4>
                        <div className="space-y-2 mb-3">
                          {selectedConcern.notes.length === 0 ? (
                            <p className="text-white/40 text-xs">No notes yet</p>
                          ) : (
                            selectedConcern.notes.map((note, i) => (
                              <div key={i} className="bg-black/30 rounded-lg p-3">
                                <p className="text-white/80 text-sm">{note}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a note..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            className="bg-black/30 border-white/10 text-white text-sm"
                            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                          />
                          <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                            Add
                          </Button>
                        </div>
                      </div>

                      {/* Actions Taken */}
                      <div>
                        <h4 className="text-white/70 text-sm font-medium mb-2">Actions Taken</h4>
                        <div className="space-y-2 mb-3">
                          {selectedConcern.actionsTaken.length === 0 ? (
                            <p className="text-white/40 text-xs">No actions recorded</p>
                          ) : (
                            selectedConcern.actionsTaken.map((action) => (
                              <div key={action.id} className="bg-black/30 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span className="text-[10px] text-white/40">
                                    {new Date(action.takenAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-white/80 text-sm">{action.action}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Record an action..."
                            value={newAction}
                            onChange={(e) => setNewAction(e.target.value)}
                            className="bg-black/30 border-white/10 text-white text-sm"
                            onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
                          />
                          <Button size="sm" onClick={handleAddAction} disabled={!newAction.trim()}>
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/50">Select a concern to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Concern Modal */}
          <AnimatePresence>
            {isAddingConcern && (
              <motion.div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Log New Concern</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-white/70 mb-1 block">Employee Name *</label>
                        <Input
                          placeholder="John Doe"
                          value={newConcern.employeeName}
                          onChange={(e) => setNewConcern({ ...newConcern, employeeName: e.target.value })}
                          className="bg-black/30 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-white/70 mb-1 block">Department</label>
                        <Input
                          placeholder="Engineering"
                          value={newConcern.department}
                          onChange={(e) => setNewConcern({ ...newConcern, department: e.target.value })}
                          className="bg-black/30 border-white/10 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-white/70 mb-1 block">Subject *</label>
                      <Input
                        placeholder="Brief description of the concern"
                        value={newConcern.subject}
                        onChange={(e) => setNewConcern({ ...newConcern, subject: e.target.value })}
                        className="bg-black/30 border-white/10 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-white/70 mb-1 block">Category</label>
                        <Select
                          value={newConcern.category}
                          onValueChange={(value) =>
                            setNewConcern({ ...newConcern, category: value as EmployeeConcern["category"] })
                          }
                        >
                          <SelectTrigger className="bg-black/30 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryConfig).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-white/70 mb-1 block">Priority</label>
                        <Select
                          value={newConcern.priority}
                          onValueChange={(value) =>
                            setNewConcern({ ...newConcern, priority: value as EmployeeConcern["priority"] })
                          }
                        >
                          <SelectTrigger className="bg-black/30 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityConfig).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-white/70 mb-1 block">Description</label>
                      <Textarea
                        placeholder="Detailed description of the concern..."
                        value={newConcern.description}
                        onChange={(e) => setNewConcern({ ...newConcern, description: e.target.value })}
                        className="bg-black/30 border-white/10 text-white min-h-[100px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-white/70 mb-1 block">Follow-up Date</label>
                        <Input
                          type="date"
                          value={newConcern.followUpDate}
                          onChange={(e) => setNewConcern({ ...newConcern, followUpDate: e.target.value })}
                          className="bg-black/30 border-white/10 text-white"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newConcern.isConfidential}
                            onChange={(e) => setNewConcern({ ...newConcern, isConfidential: e.target.checked })}
                            className="rounded border-white/20"
                          />
                          <span className="text-sm text-white/70">Mark as Confidential</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" onClick={() => setIsAddingConcern(false)} className="text-white/70">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddConcern}
                      disabled={!newConcern.employeeName || !newConcern.subject}
                      className="bg-gradient-to-r from-rose-500 to-pink-600"
                    >
                      Log Concern
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
