"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, PhoneOff, Volume2, VolumeX, Loader2, Radio, AudioWaveform, Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"

interface VoiceConversationProps {
  onTranscript?: (text: string, isUser: boolean) => void
  onStatusChange?: (status: string) => void
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export function VoiceConversation({ onTranscript, onStatusChange }: VoiceConversationProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

  const { coreMemory, aiSettings } = useHRStore()

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)

  const updateStatus = useCallback(
    (newStatus: ConnectionStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange],
  )

  const float32ToInt16 = (buffer: Float32Array): Int16Array => {
    const int16Buffer = new Int16Array(buffer.length)
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]))
      int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16Buffer
  }

  const int16ToFloat32 = (buffer: Int16Array): Float32Array => {
    const float32Buffer = new Float32Array(buffer.length)
    for (let i = 0; i < buffer.length; i++) {
      float32Buffer[i] = buffer[i] / (buffer[i] < 0 ? 0x8000 : 0x7fff)
    }
    return float32Buffer
  }

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return
    if (!isSpeakerOn) {
      audioQueueRef.current = []
      return
    }

    isPlayingRef.current = true
    setIsAISpeaking(true)

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()
      if (!audioData || !audioContextRef.current) continue

      const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000)
      audioBuffer.getChannelData(0).set(audioData)

      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)

      await new Promise<void>((resolve) => {
        source.onended = () => resolve()
        source.start()
      })
    }

    isPlayingRef.current = false
    setIsAISpeaking(false)
  }, [isSpeakerOn])

  const buildSystemInstruction = useCallback(() => {
    let instruction = `You are an expert HR Manager Assistant named Atlas. You have a friendly, professional tone and help with HR tasks.

Your capabilities include:
- Drafting HR policies and procedures
- Answering employee and management questions
- Providing guidance on HR best practices
- Helping with performance reviews and feedback
- Creating onboarding and training materials
- Assisting with employee relations issues

Communication style: ${aiSettings.tone || "professional"}
Response length preference: ${aiSettings.responseLength || "detailed"}
`

    if (aiSettings.companyName) {
      instruction += `\nYou work for ${aiSettings.companyName}.`
    }
    if (aiSettings.industry) {
      instruction += ` The company is in the ${aiSettings.industry} industry.`
    }

    if (coreMemory.length > 0 && aiSettings.useCorememory) {
      instruction += `\n\n--- CORE MEMORY (Company Knowledge Base) ---\n`
      coreMemory.forEach((mem, idx) => {
        instruction += `\n[Document ${idx + 1}: ${mem.title}]\n`
        instruction += `Summary: ${mem.summary}\n`
        if (mem.keywords?.length) {
          instruction += `Keywords: ${mem.keywords.join(", ")}\n`
        }
      })
      instruction += `\n--- END CORE MEMORY ---\n`
      instruction += `\nUse the above core memory to provide accurate, company-specific answers when relevant.`
    }

    instruction += `\n\nKeep responses conversational and concise since this is a voice conversation. Speak naturally.`

    return instruction
  }, [aiSettings, coreMemory])

  const stopAudioCapture = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }, [])

  const startAudioCapture = useCallback(() => {
    if (!mediaStreamRef.current || !audioContextRef.current) return

    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (e) => {
      if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

      const inputData = e.inputBuffer.getChannelData(0)

      let sum = 0
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i]
      }
      const rms = Math.sqrt(sum / inputData.length)
      const isVoice = rms > 0.01

      setIsUserSpeaking(isVoice)

      if (isVoice) {
        const int16Data = float32ToInt16(inputData)
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(int16Data.buffer)))

        const message = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64Audio,
              },
            ],
          },
        }

        wsRef.current.send(JSON.stringify(message))
      }
    }

    source.connect(processor)
    processor.connect(audioContextRef.current.destination)
    processorRef.current = processor
  }, [isMuted])

  const startConversation = useCallback(async () => {
    try {
      setError(null)
      setDebugInfo("Starting connection...")
      updateStatus("connecting")

      console.log("[v0] Fetching voice session...")
      const sessionResponse = await fetch("/api/voice-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: buildSystemInstruction(),
        }),
      })

      console.log("[v0] Session response status:", sessionResponse.status)
      const sessionData = await sessionResponse.json()
      console.log("[v0] Session data:", sessionData)

      if (!sessionData.success) {
        throw new Error(sessionData.error || "Failed to create voice session")
      }

      setDebugInfo("Got session, initializing audio...")

      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      console.log("[v0] Audio context created")

      try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        console.log("[v0] Microphone access granted")
      } catch (micError) {
        console.error("[v0] Microphone error:", micError)
        throw new Error("Microphone access denied. Please allow microphone access and try again.")
      }

      setDebugInfo("Connecting to Gemini...")
      console.log("[v0] Connecting to WebSocket:", sessionData.wsUrl.substring(0, 80) + "...")

      const ws = new WebSocket(sessionData.wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[v0] WebSocket connected, sending setup...")
        setDebugInfo("WebSocket connected, sending setup...")

        const setupMessage = {
          setup: {
            model: sessionData.config.model,
            generationConfig: sessionData.config.generationConfig,
            systemInstruction: {
              parts: [{ text: sessionData.config.systemInstruction }],
            },
          },
        }
        console.log("[v0] Setup message:", JSON.stringify(setupMessage).substring(0, 200))
        ws.send(JSON.stringify(setupMessage))
      }

      ws.onmessage = async (event) => {
        try {
          console.log(
            "[v0] Received message:",
            typeof event.data === "string" ? event.data.substring(0, 200) : "binary",
          )
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data

          if (data.setupComplete) {
            console.log("[v0] Setup complete!")
            setDebugInfo("")
            updateStatus("connected")
            startAudioCapture()
            return
          }

          if (data.serverContent) {
            const content = data.serverContent

            if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.mimeType?.startsWith("audio/")) {
                  const audioData = atob(part.inlineData.data)
                  const int16Array = new Int16Array(audioData.length / 2)
                  for (let i = 0; i < int16Array.length; i++) {
                    int16Array[i] = audioData.charCodeAt(i * 2) | (audioData.charCodeAt(i * 2 + 1) << 8)
                  }
                  const float32Data = int16ToFloat32(int16Array)
                  audioQueueRef.current.push(float32Data)
                  playAudioQueue()
                }

                if (part.text) {
                  setCurrentTranscript(part.text)
                  onTranscript?.(part.text, false)
                }
              }
            }

            if (content.turnComplete) {
              setCurrentTranscript("")
            }
          }

          if (data.error) {
            console.error("[v0] API error:", data.error)
            setError(data.error.message || "API error occurred")
            updateStatus("error")
          }
        } catch (e) {
          console.error("[v0] Error processing message:", e)
        }
      }

      ws.onerror = (event) => {
        console.error("[v0] WebSocket error:", event)
        setDebugInfo("")
        setError("Connection error. Please check your API key and try again.")
        updateStatus("error")
      }

      ws.onclose = (event) => {
        console.log("[v0] WebSocket closed:", event.code, event.reason)
        setDebugInfo("")
        if (status !== "error") {
          updateStatus("disconnected")
        }
        stopAudioCapture()
      }
    } catch (err) {
      console.error("[v0] Failed to start conversation:", err)
      setDebugInfo("")
      setError(err instanceof Error ? err.message : "Failed to start voice conversation")
      updateStatus("error")
    }
  }, [buildSystemInstruction, updateStatus, playAudioQueue, onTranscript, startAudioCapture, stopAudioCapture, status])

  const endConversation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    stopAudioCapture()
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    audioQueueRef.current = []
    updateStatus("disconnected")
    setIsAISpeaking(false)
    setIsUserSpeaking(false)
    setDebugInfo("")
  }, [stopAudioCapture, updateStatus])

  useEffect(() => {
    return () => {
      endConversation()
    }
  }, [endConversation])

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn)
    if (isSpeakerOn) {
      audioQueueRef.current = []
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-center">
        <div
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            status === "disconnected" && "bg-slate-100 text-slate-600",
            status === "connecting" && "bg-amber-100 text-amber-700",
            status === "connected" && "bg-green-100 text-green-700",
            status === "error" && "bg-red-100 text-red-700",
          )}
        >
          {status === "disconnected" && (
            <>
              <Radio className="w-4 h-4" />
              Ready to connect
            </>
          )}
          {status === "connecting" && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          )}
          {status === "connected" && (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected
            </>
          )}
          {status === "error" && (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Error
            </>
          )}
        </div>
        {debugInfo && <p className="text-xs text-slate-400 mt-2">{debugInfo}</p>}
      </div>

      <div className="relative">
        <motion.div
          className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-blue-500 to-violet-600",
            "shadow-lg shadow-blue-500/30",
          )}
          animate={{
            scale: isAISpeaking ? [1, 1.1, 1] : isUserSpeaking ? [1, 1.05, 1] : 1,
            boxShadow: isAISpeaking
              ? [
                  "0 10px 40px -10px rgba(99, 102, 241, 0.3)",
                  "0 10px 60px -10px rgba(99, 102, 241, 0.5)",
                  "0 10px 40px -10px rgba(99, 102, 241, 0.3)",
                ]
              : isUserSpeaking
                ? [
                    "0 10px 40px -10px rgba(34, 197, 94, 0.3)",
                    "0 10px 50px -10px rgba(34, 197, 94, 0.4)",
                    "0 10px 40px -10px rgba(34, 197, 94, 0.3)",
                  ]
                : "0 10px 40px -10px rgba(99, 102, 241, 0.3)",
          }}
          transition={{
            duration: 0.5,
            repeat: isAISpeaking || isUserSpeaking ? Number.POSITIVE_INFINITY : 0,
            ease: "easeInOut",
          }}
        >
          <AudioWaveform className="w-12 h-12 text-white" />
        </motion.div>

        <AnimatePresence>
          {isAISpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-600 text-white text-xs rounded-full"
            >
              AI Speaking
            </motion.div>
          )}
          {isUserSpeaking && !isAISpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-600 text-white text-xs rounded-full"
            >
              Listening...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {currentTranscript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-xl"
        >
          {currentTranscript}
        </motion.div>
      )}

      {error && <div className="max-w-md text-center text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</div>}

      <div className="flex items-center gap-4">
        {status === "connected" && (
          <>
            <Button
              variant="outline"
              size="icon"
              className={cn("rounded-full w-12 h-12", isMuted && "bg-red-100 border-red-200 text-red-600")}
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button variant="destructive" size="icon" className="rounded-full w-16 h-16" onClick={endConversation}>
              <PhoneOff className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className={cn("rounded-full w-12 h-12", !isSpeakerOn && "bg-slate-100 text-slate-400")}
              onClick={toggleSpeaker}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </>
        )}

        {status === "disconnected" && (
          <Button
            size="lg"
            className="rounded-full px-8 h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            onClick={startConversation}
          >
            <Phone className="w-5 h-5 mr-2" />
            Start Voice Chat
          </Button>
        )}

        {status === "connecting" && (
          <Button size="lg" disabled className="rounded-full px-8 h-14">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Connecting...
          </Button>
        )}

        {status === "error" && (
          <Button size="lg" className="rounded-full px-8 h-14" onClick={startConversation}>
            <Phone className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        )}
      </div>

      {status === "disconnected" && (
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Start a real-time voice conversation with the AI assistant. Speak naturally and the AI will respond with
          voice.
        </p>
      )}

      {status === "connected" && (
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Speak naturally. The AI will listen and respond in real-time.
          {coreMemory.length > 0 && aiSettings.useCorememory && (
            <span className="block mt-1 text-violet-600">
              {coreMemory.length} memory document{coreMemory.length > 1 ? "s" : ""} active
            </span>
          )}
        </p>
      )}
    </div>
  )
}
