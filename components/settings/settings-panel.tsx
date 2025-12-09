"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Brain,
  FileText,
  MessageSquare,
  Shield,
  Trash2,
  Plus,
  Building2,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Mic,
  Volume2,
  Sliders,
  Zap,
  Gauge,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useHRStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = "general" | "ai" | "memory" | "privacy"

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const [newMemoryText, setNewMemoryText] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  const {
    aiSettings,
    updateAISettings,
    resetAISettings,
    coreMemory,
    addToCoreMemory,
    removeFromCoreMemory,
    clearCoreMemory,
    clearMessages,
    clearDocuments,
  } = useHRStore()

  const tabs = [
    { id: "general" as const, label: "General", icon: Building2 },
    { id: "ai" as const, label: "AI Settings", icon: Brain },
    { id: "memory" as const, label: "Core Memory", icon: FileText },
    { id: "privacy" as const, label: "Privacy", icon: Shield },
  ]

  const handleAddMemory = () => {
    if (!newMemoryText.trim()) return

    addToCoreMemory({
      id: Date.now().toString(),
      name: `Custom Note ${coreMemory.length + 1}`,
      type: "text",
      summary: newMemoryText.substring(0, 100),
      content: newMemoryText,
      keywords: newMemoryText.split(" ").slice(0, 5),
      addedAt: Date.now(),
      category: "other",
    })
    setNewMemoryText("")
  }

  const handleClearAllData = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      clearMessages()
      clearDocuments()
      clearCoreMemory()
      resetAISettings()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex"
          >
            {/* Sidebar */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col">
              <div className="flex items-center gap-3 mb-6 px-2">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Settings</h2>
                  <p className="text-xs text-slate-500">Configure your assistant</p>
                </div>
              </div>

              <nav className="space-y-1 flex-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      activeTab === tab.id
                        ? "bg-white shadow-sm text-violet-700 border border-slate-200"
                        : "text-slate-600 hover:bg-white/50",
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                    {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </nav>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-slate-600 bg-transparent"
                  onClick={() => resetAISettings()}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Defaults
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">{tabs.find((t) => t.id === activeTab)?.label}</h3>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  {activeTab === "general" && (
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                        <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-violet-600" />
                          Company Information
                        </h4>
                        <div className="grid gap-4">
                          <div>
                            <Label className="text-sm">Company Name</Label>
                            <Input
                              value={aiSettings.companyName}
                              onChange={(e) => updateAISettings({ companyName: e.target.value })}
                              placeholder="Enter your company name"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Industry</Label>
                            <Select
                              value={aiSettings.industry}
                              onValueChange={(value) => updateAISettings({ industry: value })}
                            >
                              <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technology">Technology</SelectItem>
                                <SelectItem value="healthcare">Healthcare</SelectItem>
                                <SelectItem value="finance">Finance</SelectItem>
                                <SelectItem value="retail">Retail</SelectItem>
                                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="education">Education</SelectItem>
                                <SelectItem value="government">Government</SelectItem>
                                <SelectItem value="nonprofit">Non-Profit</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                        <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-violet-600" />
                          Response Preferences
                        </h4>
                        <div className="grid gap-4">
                          <div>
                            <Label className="text-sm">Response Length</Label>
                            <Select
                              value={aiSettings.responseLength}
                              onValueChange={(value: "concise" | "detailed" | "comprehensive") =>
                                updateAISettings({ responseLength: value })
                              }
                            >
                              <SelectTrigger className="mt-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="concise">Concise - Brief and to the point</SelectItem>
                                <SelectItem value="detailed">Detailed - Balanced detail</SelectItem>
                                <SelectItem value="comprehensive">Comprehensive - Full explanations</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm">Communication Tone</Label>
                            <Select
                              value={aiSettings.tone}
                              onValueChange={(value: "professional" | "friendly" | "formal") =>
                                updateAISettings({ tone: value })
                              }
                            >
                              <SelectTrigger className="mt-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="formal">Formal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "ai" && (
                    <TooltipProvider>
                      <div className="space-y-6 max-w-2xl">
                        {/* Model Selection */}
                        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-6 border border-violet-200">
                          <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-violet-600" />
                            Model Selection
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Label className="text-sm">Grok Model</Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="w-3.5 h-3.5 text-slate-400" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>Choose the Grok model variant. Larger models are more capable but slower.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={aiSettings.grokModel}
                                onValueChange={(value: "grok-4" | "grok-4-fast" | "grok-3" | "grok-3-mini") =>
                                  updateAISettings({ grokModel: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="grok-4">
                                    <div className="flex items-center gap-2">
                                      <span>Grok 4</span>
                                      <Badge variant="secondary" className="text-xs">
                                        Most Capable
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="grok-4-fast">
                                    <div className="flex items-center gap-2">
                                      <span>Grok 4 Fast</span>
                                      <Badge variant="outline" className="text-xs">
                                        Faster
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="grok-3">Grok 3</SelectItem>
                                  <SelectItem value="grok-3-mini">
                                    <div className="flex items-center gap-2">
                                      <span>Grok 3 Mini</span>
                                      <Badge variant="outline" className="text-xs">
                                        Lightweight
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Label className="text-sm">Model Preference</Label>
                              </div>
                              <Select
                                value={aiSettings.modelPreference}
                                onValueChange={(value: "balanced" | "fast" | "thorough") =>
                                  updateAISettings({ modelPreference: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fast">Fast - Quick responses</SelectItem>
                                  <SelectItem value="balanced">Balanced - Best overall</SelectItem>
                                  <SelectItem value="thorough">Thorough - Detailed analysis</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Advanced Parameters */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                          <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-violet-600" />
                              <span className="font-medium text-slate-900">Advanced Parameters</span>
                              <Badge variant="outline" className="text-xs">
                                Pro
                              </Badge>
                            </div>
                            <ChevronRight
                              className={cn("w-4 h-4 text-slate-400 transition-transform", showAdvanced && "rotate-90")}
                            />
                          </button>

                          <AnimatePresence>
                            {showAdvanced && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-slate-200"
                              >
                                <div className="p-6 space-y-6">
                                  {/* Temperature */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Label className="text-sm">Temperature</Label>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Info className="w-3.5 h-3.5 text-slate-400" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p>
                                              Controls randomness. Lower values make output more focused and
                                              deterministic. Higher values make it more creative.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                      <span className="text-sm font-mono text-violet-600">
                                        {aiSettings.temperature.toFixed(2)}
                                      </span>
                                    </div>
                                    <Slider
                                      value={[aiSettings.temperature]}
                                      onValueChange={([value]) => updateAISettings({ temperature: value })}
                                      min={0}
                                      max={2}
                                      step={0.05}
                                      className="w-full"
                                    />
                                    <div className="flex justify-between mt-1">
                                      <span className="text-xs text-slate-400">Focused (0)</span>
                                      <span className="text-xs text-slate-400">Creative (2)</span>
                                    </div>
                                  </div>

                                  {/* Top P */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Label className="text-sm">Top P (Nucleus Sampling)</Label>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Info className="w-3.5 h-3.5 text-slate-400" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p>
                                              Controls diversity via nucleus sampling. 0.9 means only consider tokens
                                              comprising the top 90% probability mass.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                      <span className="text-sm font-mono text-violet-600">
                                        {aiSettings.topP.toFixed(2)}
                                      </span>
                                    </div>
                                    <Slider
                                      value={[aiSettings.topP]}
                                      onValueChange={([value]) => updateAISettings({ topP: value })}
                                      min={0}
                                      max={1}
                                      step={0.05}
                                      className="w-full"
                                    />
                                    <div className="flex justify-between mt-1">
                                      <span className="text-xs text-slate-400">Narrow (0)</span>
                                      <span className="text-xs text-slate-400">Diverse (1)</span>
                                    </div>
                                  </div>

                                  {/* Max Tokens */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Label className="text-sm">Max Output Tokens</Label>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Info className="w-3.5 h-3.5 text-slate-400" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p>
                                              Maximum number of tokens to generate. Higher values allow longer responses
                                              but take more time.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                      <span className="text-sm font-mono text-violet-600">{aiSettings.maxTokens}</span>
                                    </div>
                                    <Slider
                                      value={[aiSettings.maxTokens]}
                                      onValueChange={([value]) => updateAISettings({ maxTokens: value })}
                                      min={256}
                                      max={8192}
                                      step={256}
                                      className="w-full"
                                    />
                                    <div className="flex justify-between mt-1">
                                      <span className="text-xs text-slate-400">Short (256)</span>
                                      <span className="text-xs text-slate-400">Long (8192)</span>
                                    </div>
                                  </div>

                                  {/* Frequency Penalty */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Label className="text-sm">Frequency Penalty</Label>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Info className="w-3.5 h-3.5 text-slate-400" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p>
                                              Reduces repetition by penalizing tokens based on how often they appear.
                                              Positive values decrease repetition.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                      <span className="text-sm font-mono text-violet-600">
                                        {aiSettings.frequencyPenalty.toFixed(2)}
                                      </span>
                                    </div>
                                    <Slider
                                      value={[aiSettings.frequencyPenalty]}
                                      onValueChange={([value]) => updateAISettings({ frequencyPenalty: value })}
                                      min={-2}
                                      max={2}
                                      step={0.1}
                                      className="w-full"
                                    />
                                    <div className="flex justify-between mt-1">
                                      <span className="text-xs text-slate-400">Allow Repetition (-2)</span>
                                      <span className="text-xs text-slate-400">No Repetition (2)</span>
                                    </div>
                                  </div>

                                  {/* Presence Penalty */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Label className="text-sm">Presence Penalty</Label>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Info className="w-3.5 h-3.5 text-slate-400" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p>
                                              Encourages new topics by penalizing tokens that have appeared. Positive
                                              values increase topic diversity.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                      <span className="text-sm font-mono text-violet-600">
                                        {aiSettings.presencePenalty.toFixed(2)}
                                      </span>
                                    </div>
                                    <Slider
                                      value={[aiSettings.presencePenalty]}
                                      onValueChange={([value]) => updateAISettings({ presencePenalty: value })}
                                      min={-2}
                                      max={2}
                                      step={0.1}
                                      className="w-full"
                                    />
                                    <div className="flex justify-between mt-1">
                                      <span className="text-xs text-slate-400">Stay on Topic (-2)</span>
                                      <span className="text-xs text-slate-400">Explore Topics (2)</span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Voice Settings */}
                        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
                          <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                            <Mic className="w-4 h-4 text-cyan-600" />
                            Voice Settings
                          </h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Enable Voice Mode</Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="w-3.5 h-3.5 text-slate-400" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>Enable voice input and output using HuggingFace Whisper for speech-to-text.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Switch
                                checked={aiSettings.voiceEnabled}
                                onCheckedChange={(checked) => updateAISettings({ voiceEnabled: checked })}
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Auto-play Responses</Label>
                              </div>
                              <Switch
                                checked={aiSettings.voiceAutoPlay}
                                onCheckedChange={(checked) => updateAISettings({ voiceAutoPlay: checked })}
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Volume2 className="w-4 h-4 text-cyan-600" />
                                  <Label className="text-sm">Voice Speed</Label>
                                </div>
                                <span className="text-sm font-mono text-cyan-600">
                                  {aiSettings.voiceSpeed.toFixed(1)}x
                                </span>
                              </div>
                              <Slider
                                value={[aiSettings.voiceSpeed]}
                                onValueChange={([value]) => updateAISettings({ voiceSpeed: value })}
                                min={0.5}
                                max={2}
                                step={0.1}
                                className="w-full"
                              />
                              <div className="flex justify-between mt-1">
                                <span className="text-xs text-slate-400">Slow (0.5x)</span>
                                <span className="text-xs text-slate-400">Fast (2x)</span>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Label className="text-sm">Speech Recognition Model</Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="w-3.5 h-3.5 text-slate-400" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>
                                      Whisper Large is more accurate but slower. Whisper Small is faster but less
                                      accurate.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={aiSettings.sttModel}
                                onValueChange={(value: "whisper-large-v3" | "whisper-small") =>
                                  updateAISettings({ sttModel: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="whisper-large-v3">
                                    <div className="flex items-center gap-2">
                                      <span>Whisper Large V3</span>
                                      <Badge variant="secondary" className="text-xs">
                                        Best Quality
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="whisper-small">
                                    <div className="flex items-center gap-2">
                                      <span>Whisper Small</span>
                                      <Badge variant="outline" className="text-xs">
                                        Faster
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Feature Toggles */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                          <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-violet-600" />
                            Feature Toggles
                          </h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-sm">Use Core Memory</Label>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Include core memory context in AI responses
                                </p>
                              </div>
                              <Switch
                                checked={aiSettings.useCorememory}
                                onCheckedChange={(checked) => updateAISettings({ useCorememory: checked })}
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-sm">Auto-Summarize Documents</Label>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Automatically generate summaries when uploading documents
                                </p>
                              </div>
                              <Switch
                                checked={aiSettings.autoSummarize}
                                onCheckedChange={(checked) => updateAISettings({ autoSummarize: checked })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </TooltipProvider>
                  )}

                  {activeTab === "memory" && (
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                        <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-amber-600" />
                          Core Memory
                        </h4>
                        <p className="text-sm text-slate-600 mb-4">
                          Add important information that the AI should always remember and reference.
                        </p>

                        <div className="space-y-4">
                          <div>
                            <Textarea
                              value={newMemoryText}
                              onChange={(e) => setNewMemoryText(e.target.value)}
                              placeholder="Add important information (e.g., company policies, key contacts, procedures...)"
                              rows={3}
                              className="resize-none"
                            />
                            <Button
                              onClick={handleAddMemory}
                              disabled={!newMemoryText.trim()}
                              className="mt-2"
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Memory
                            </Button>
                          </div>
                        </div>
                      </div>

                      {coreMemory.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-slate-900">Stored Memories ({coreMemory.length})</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirm("Clear all memories?") && clearCoreMemory()}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Clear All
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {coreMemory.map((item) => (
                              <div
                                key={item.id}
                                className="bg-white border border-slate-200 rounded-lg p-4 group hover:border-slate-300 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-medium text-slate-900 truncate">{item.name}</h5>
                                      <Badge variant="outline" className="text-xs">
                                        {item.type}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                      {item.summary || item.content.substring(0, 150)}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2">
                                      Added {new Date(item.addedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFromCoreMemory(item.id)}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {coreMemory.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                          <p className="font-medium">No memories stored yet</p>
                          <p className="text-sm">Add important information above</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "privacy" && (
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border border-red-200">
                        <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-600" />
                          Data Management
                        </h4>
                        <p className="text-sm text-slate-600 mb-4">Manage your stored data and privacy settings.</p>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100">
                            <div>
                              <p className="font-medium text-slate-900">Clear Chat History</p>
                              <p className="text-sm text-slate-500">Remove all conversation messages</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirm("Clear chat history?") && clearMessages()}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Clear
                            </Button>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100">
                            <div>
                              <p className="font-medium text-slate-900">Clear All Documents</p>
                              <p className="text-sm text-slate-500">Remove all uploaded documents</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirm("Clear all documents?") && clearDocuments()}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Clear
                            </Button>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100">
                            <div>
                              <p className="font-medium text-slate-900">Reset All Data</p>
                              <p className="text-sm text-slate-500">Clear everything and start fresh</p>
                            </div>
                            <Button variant="destructive" size="sm" onClick={handleClearAllData}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Reset All
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
