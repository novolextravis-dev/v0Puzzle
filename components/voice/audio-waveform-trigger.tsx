"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"

interface AudioWaveformTriggerProps {
  onTranscript?: (text: string, isUser: boolean) => void
  onToolCall?: (toolCall: { tool: string; parameters?: Record<string, string> }) => void
  className?: string
  orbSize?: number
}

type ConnectionStatus = "idle" | "connecting" | "connected" | "listening" | "processing" | "speaking" | "error"

export function AudioWaveformTrigger({
  onTranscript,
  onToolCall,
  className,
  orbSize = 288,
}: AudioWaveformTriggerProps) {
  const [status, setStatus] = useState<ConnectionStatus>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(36).fill(0.1))
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(false)
  const [isRingHovered, setIsRingHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [useHuggingFace, setUseHuggingFace] = useState(true)

  const { coreMemory, aiSettings, addAIActivity, updateAIActivity, addMessage, messages } = useHRStore()

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const activityIdRef = useRef<string>("")
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef(false)

  const ringRadius = orbSize / 2 + 50
  const ringThickness = 30

  const updateAudioLevels = useCallback(() => {
    if (analyserRef.current && (status === "connected" || status === "listening")) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)

      const levels: number[] = []
      const step = Math.floor(dataArray.length / 36)
      for (let i = 0; i < 36; i++) {
        const value = dataArray[i * step] / 255
        levels.push(Math.max(0.15, value))
      }
      setAudioLevels(levels)
    } else if (status === "idle") {
      const hoverMultiplier = isRingHovered ? 1.8 : 1
      setAudioLevels((prev) =>
        prev.map((_, i) => {
          const base = 0.15 + Math.sin(Date.now() / 800 + i * 0.3) * 0.12 * hoverMultiplier
          const wave2 = Math.sin(Date.now() / 1200 + i * 0.5) * 0.08 * hoverMultiplier
          return base + wave2
        }),
      )
    } else if (status === "connecting" || status === "processing") {
      setAudioLevels((prev) => prev.map((_, i) => 0.2 + Math.sin(Date.now() / 300 + i * 0.2) * 0.15))
    } else if (status === "speaking") {
      setAudioLevels((prev) => prev.map((_, i) => 0.3 + Math.sin(Date.now() / 150 + i * 0.4) * 0.35))
    }
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels)
  }, [status, isRingHovered])

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [updateAudioLevels])

  const playAudioFromBase64 = useCallback(
    (base64Audio: string) => {
      return new Promise<void>((resolve) => {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`)
        audioPlayerRef.current = audio

        audio.onended = () => {
          setStatus("listening")
          setStatusMessage("Listening...")
          resolve()
          // Restart recording after AI finishes speaking
          if (!isMuted && mediaRecorderRef.current?.state === "inactive") {
            startRecording()
          }
        }

        audio.onerror = () => {
          console.error("Audio playback error")
          setStatus("listening")
          resolve()
        }

        setStatus("speaking")
        setStatusMessage("Speaking...")
        audio.play().catch(() => {
          setStatus("listening")
          resolve()
        })
      })
    },
    [isMuted],
  )

  const speakWithBrowserTTS = useCallback(
    (text: string) => {
      return new Promise<void>((resolve) => {
        const synth = window.speechSynthesis
        synth.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.0
        utterance.pitch = 1.0

        const voices = synth.getVoices()
        const preferredVoice = voices.find(
          (v) => v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel"),
        )
        if (preferredVoice) {
          utterance.voice = preferredVoice
        }

        utterance.onend = () => {
          setStatus("listening")
          setStatusMessage("Listening...")
          resolve()
          if (!isMuted && mediaRecorderRef.current?.state === "inactive") {
            startRecording()
          }
        }

        utterance.onerror = () => {
          setStatus("listening")
          resolve()
        }

        setStatus("speaking")
        setStatusMessage("Speaking...")
        synth.speak(utterance)
      })
    },
    [isMuted],
  )

  const speakText = useCallback(
    async (text: string) => {
      if (!isSpeakerOn || !text) return

      // Stop any current recording
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop()
      }

      if (useHuggingFace) {
        try {
          setStatus("processing")
          setStatusMessage("Generating speech...")

          const response = await fetch("/api/text-to-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.audio) {
              await playAudioFromBase64(data.audio)
              return
            }
          }

          // Fallback to browser TTS
          await speakWithBrowserTTS(text)
        } catch (err) {
          console.error("TTS error:", err)
          await speakWithBrowserTTS(text)
        }
      } else {
        await speakWithBrowserTTS(text)
      }
    },
    [isSpeakerOn, useHuggingFace, playAudioFromBase64, speakWithBrowserTTS],
  )

  const processAudioWithHuggingFace = useCallback(async (audioBlob: Blob) => {
    try {
      setStatus("processing")
      setStatusMessage("Transcribing...")

      // Convert to WAV format for better compatibility
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.wav")

      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Transcription failed")
      }

      const data = await response.json()
      return data.text || ""
    } catch (err) {
      console.error("STT error:", err)
      throw err
    }
  }, [])

  const processUserSpeech = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setStatus("listening")
        setStatusMessage("Listening...")
        return
      }

      onTranscript?.(text, true)
      addMessage({
        id: `voice-user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      })

      updateAIActivity(activityIdRef.current, {
        description: `Processing: "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"`,
      })

      try {
        setStatusMessage("Thinking...")

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages.slice(-10).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            coreMemory: aiSettings.useCorememory ? coreMemory : [],
            aiSettings,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to get AI response")
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        const aiResponse = data.response || ""

        if (data.toolCall && data.toolCall.tool !== "none") {
          onToolCall?.(data.toolCall)
        }

        if (aiResponse) {
          addMessage({
            id: `voice-ai-${Date.now()}`,
            role: "assistant",
            content: aiResponse,
            timestamp: Date.now(),
          })

          onTranscript?.(aiResponse, false)
          await speakText(aiResponse)

          updateAIActivity(activityIdRef.current, {
            description: "Voice chat active",
          })
        }
      } catch (err) {
        console.error("Error processing speech:", err)
        const errorMsg = "I'm sorry, I encountered an error. Please try again."
        await speakText(errorMsg)
        onTranscript?.(errorMsg, false)
      }
    },
    [onTranscript, onToolCall, addMessage, messages, coreMemory, aiSettings, speakText, updateAIActivity],
  )

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || !mediaStreamRef.current) return

    try {
      audioChunksRef.current = []
      isRecordingRef.current = true

      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        isRecordingRef.current = false

        if (audioChunksRef.current.length === 0) return

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })

        // Only process if we have meaningful audio (>0.5 seconds)
        if (audioBlob.size > 5000) {
          try {
            if (useHuggingFace) {
              const text = await processAudioWithHuggingFace(audioBlob)
              if (text) {
                await processUserSpeech(text)
              } else {
                setStatus("listening")
                setStatusMessage("Listening...")
                startRecording()
              }
            }
          } catch (err) {
            console.error("Error processing audio:", err)
            setStatus("listening")
            setStatusMessage("Listening...")
            startRecording()
          }
        } else {
          // Restart recording for short clips
          if (status === "listening" || status === "connected") {
            startRecording()
          }
        }
      }

      mediaRecorder.start()
      setStatus("listening")
      setStatusMessage("Listening...")

      // Auto-stop after 10 seconds of recording
      silenceTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop()
        }
      }, 10000)
    } catch (err) {
      console.error("Recording error:", err)
      isRecordingRef.current = false
    }
  }, [useHuggingFace, processAudioWithHuggingFace, processUserSpeech, status])

  const stopRecording = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    isRecordingRef.current = false
  }, [])

  const startConversation = useCallback(async () => {
    try {
      setError(null)
      setStatus("connecting")
      setStatusMessage("Initializing...")

      const activityId = `voice-${Date.now()}`
      activityIdRef.current = activityId
      addAIActivity({
        id: activityId,
        type: "voice",
        title: "Voice Conversation",
        description: "Starting voice chat...",
        status: "running",
        startedAt: Date.now(),
      })

      // Request microphone access
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      })

      // Create audio context for visualization
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      setStatus("connected")
      setShowControls(true)
      setStatusMessage("Ready")

      updateAIActivity(activityId, {
        description: "Voice chat active",
        status: "running",
      })

      // Greet the user
      const greeting = aiSettings.companyName
        ? `Hello! I'm Atlas, your HR assistant for ${aiSettings.companyName}. How can I help you today?`
        : "Hello! I'm Atlas, your HR assistant. How can I help you today?"

      onTranscript?.(greeting, false)
      addMessage({
        id: `voice-greeting-${Date.now()}`,
        role: "assistant",
        content: greeting,
        timestamp: Date.now(),
      })

      await speakText(greeting)
    } catch (err) {
      console.error("Voice conversation error:", err)
      setError(err instanceof Error ? err.message : "Failed to start voice chat")
      setStatus("error")
      setStatusMessage("Error")
      updateAIActivity(activityIdRef.current, {
        status: "error",
        description: err instanceof Error ? err.message : "Voice chat failed",
      })
    }
  }, [addAIActivity, updateAIActivity, speakText, onTranscript, addMessage, aiSettings])

  const endConversation = useCallback(() => {
    stopRecording()

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current = null
    }

    window.speechSynthesis?.cancel()

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    mediaRecorderRef.current = null

    setStatus("idle")
    setShowControls(false)
    setStatusMessage("")

    if (activityIdRef.current) {
      updateAIActivity(activityIdRef.current, {
        status: "completed",
        description: "Voice chat ended",
        completedAt: Date.now(),
      })
    }
  }, [updateAIActivity, stopRecording])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev
      if (newMuted) {
        stopRecording()
      } else if (status === "listening" || status === "connected") {
        startRecording()
      }
      return newMuted
    })
  }, [status, startRecording, stopRecording])

  useEffect(() => {
    return () => endConversation()
  }, [endConversation])

  const handleRingClick = () => {
    if (status === "idle" || status === "error") {
      startConversation()
    } else if (status !== "connecting") {
      endConversation()
    }
  }

  // Calculate wave bar positions around the ring
  const getWaveBarStyle = (index: number, level: number) => {
    const angle = (index / 36) * 360 - 90
    const radians = (angle * Math.PI) / 180
    const x = Math.cos(radians) * ringRadius
    const y = Math.sin(radians) * ringRadius

    const hoverBoost = isRingHovered ? 1.3 : 1

    return {
      left: `calc(50% + ${x}px)`,
      top: `calc(50% + ${y}px)`,
      transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
      height: `${(10 + level * 28) * hoverBoost}px`,
    }
  }

  // Get ring color based on status
  const getRingColor = () => {
    switch (status) {
      case "speaking":
        return "from-violet-400 via-purple-500 to-violet-400"
      case "listening":
        return "from-green-400 via-emerald-500 to-green-400"
      case "processing":
        return "from-amber-300 via-orange-400 to-amber-300"
      case "connected":
        return "from-emerald-300 via-teal-400 to-emerald-300"
      case "connecting":
        return "from-amber-300 via-orange-400 to-amber-300"
      case "error":
        return "from-red-300 via-red-400 to-red-300"
      default:
        return "from-slate-300 via-blue-300 to-violet-300"
    }
  }

  const getBarColor = () => {
    switch (status) {
      case "speaking":
        return "bg-violet-500"
      case "listening":
        return "bg-green-500"
      case "processing":
        return "bg-amber-500"
      case "connected":
        return "bg-teal-400"
      case "connecting":
        return "bg-amber-500"
      case "error":
        return "bg-red-400"
      default:
        return "bg-gradient-to-t from-blue-400 to-violet-400"
    }
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Clickable ring area */}
      <motion.div
        className="absolute pointer-events-auto cursor-pointer rounded-full"
        style={{
          width: (ringRadius + ringThickness / 2) * 2,
          height: (ringRadius + ringThickness / 2) * 2,
          left: `calc(50% - ${ringRadius + ringThickness / 2}px)`,
          top: `calc(50% - ${ringRadius + ringThickness / 2}px)`,
          WebkitMask: `radial-gradient(circle at center, transparent ${ringRadius - ringThickness / 2}px, black ${ringRadius - ringThickness / 2}px, black ${ringRadius + ringThickness / 2}px, transparent ${ringRadius + ringThickness / 2}px)`,
          mask: `radial-gradient(circle at center, transparent ${ringRadius - ringThickness / 2}px, black ${ringRadius - ringThickness / 2}px, black ${ringRadius + ringThickness / 2}px, transparent ${ringRadius + ringThickness / 2}px)`,
        }}
        onClick={handleRingClick}
        onMouseEnter={() => {
          setIsRingHovered(true)
          setShowTooltip(true)
        }}
        onMouseLeave={() => {
          setIsRingHovered(false)
          setShowTooltip(false)
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      />

      {/* Ring glow */}
      <motion.div
        className={cn("absolute rounded-full bg-gradient-to-r opacity-30 blur-md", getRingColor())}
        style={{
          width: ringRadius * 2 + 8,
          height: ringRadius * 2 + 8,
          left: `calc(50% - ${ringRadius + 4}px)`,
          top: `calc(50% - ${ringRadius + 4}px)`,
        }}
        animate={{
          scale: isRingHovered ? [1, 1.06, 1] : status !== "idle" ? [1, 1.02, 1] : 1,
          opacity: isRingHovered ? [0.4, 0.7, 0.4] : status !== "idle" ? [0.3, 0.5, 0.3] : 0.3,
        }}
        transition={{
          duration: isRingHovered ? 1 : 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Ring border */}
      <motion.div
        className={cn(
          "absolute rounded-full border-2 transition-colors duration-300",
          status === "idle" && (isRingHovered ? "border-blue-400/70" : "border-slate-300/50"),
          status === "connecting" && "border-amber-400/50",
          status === "processing" && "border-amber-400/50",
          status === "listening" && "border-green-400/50",
          status === "speaking" && "border-violet-400/50",
          status === "connected" && "border-teal-400/50",
          status === "error" && "border-red-400/50",
        )}
        style={{
          width: ringRadius * 2,
          height: ringRadius * 2,
          left: `calc(50% - ${ringRadius}px)`,
          top: `calc(50% - ${ringRadius}px)`,
        }}
        animate={{
          rotate: status === "connecting" || status === "processing" ? 360 : isRingHovered ? [0, 5, -5, 0] : 0,
          scale: isRingHovered ? 1.02 : 1,
        }}
        transition={{
          rotate: {
            duration: status === "connecting" || status === "processing" ? 3 : 0.5,
            repeat: status === "connecting" || status === "processing" || isRingHovered ? Number.POSITIVE_INFINITY : 0,
            ease: status === "connecting" || status === "processing" ? "linear" : "easeInOut",
          },
          scale: { duration: 0.3 },
        }}
      />

      {/* Audio wave bars */}
      {audioLevels.map((level, i) => (
        <motion.div
          key={i}
          className={cn("absolute w-[3px] rounded-full origin-center transition-all duration-100", getBarColor())}
          style={getWaveBarStyle(i, level)}
          animate={{
            opacity: isRingHovered ? 1 : status === "idle" ? 0.5 : 0.8,
          }}
          transition={{ duration: 0.1 }}
        />
      ))}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && status === "idle" && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200/50 pointer-events-none"
            style={{ top: `calc(50% - ${ringRadius + 45}px)` }}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Mic className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-700">Click to start voice chat</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status message */}
      <AnimatePresence>
        {status !== "idle" && statusMessage && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-sm shadow-lg border border-white/10 pointer-events-none"
            style={{ top: `calc(50% - ${ringRadius + 50}px)` }}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            {status === "connecting" || status === "processing" ? (
              <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
            ) : status === "listening" ? (
              <Mic className="h-4 w-4 text-green-400" />
            ) : status === "speaking" ? (
              <Volume2 className="h-4 w-4 text-violet-400" />
            ) : status === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-400" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-teal-400" />
            )}
            <span className="text-sm font-medium text-white">{statusMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control buttons */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto"
            style={{ top: `calc(50% + ${ringRadius + 25}px)` }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.button
              onClick={toggleMute}
              className={cn(
                "p-3 rounded-full backdrop-blur-sm border transition-colors",
                isMuted
                  ? "bg-red-500/20 border-red-400/30 text-red-400"
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20",
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </motion.button>

            <motion.button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={cn(
                "p-3 rounded-full backdrop-blur-sm border transition-colors",
                !isSpeakerOn
                  ? "bg-amber-500/20 border-amber-400/30 text-amber-400"
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20",
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </motion.button>

            <motion.button
              onClick={endConversation}
              className="px-4 py-2 rounded-full bg-red-500/20 border border-red-400/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              End
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-sm pointer-events-none"
            style={{ top: `calc(50% + ${ringRadius + 80}px)` }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
