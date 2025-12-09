import { type NextRequest, NextResponse } from "next/server"

const HF_API_BASE = "https://router.huggingface.co/hf-inference/models"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    // Use HuggingFace Router API with a TTS model
    const response = await fetch(`${HF_API_BASE}/facebook/mms-tts-eng`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    })

    if (!response.ok) {
      // Try alternative model if first fails
      const fallbackResponse = await fetch(`${HF_API_BASE}/espnet/kan-bayashi_ljspeech_vits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      })

      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text()
        console.error("HuggingFace TTS error:", errorText)
        return NextResponse.json({ error: "Text-to-speech failed", useBrowserTTS: true }, { status: 200 })
      }

      const audioBuffer = await fallbackResponse.arrayBuffer()
      const base64Audio = Buffer.from(audioBuffer).toString("base64")
      return NextResponse.json({ audio: base64Audio, format: "wav" })
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString("base64")
    return NextResponse.json({ audio: base64Audio, format: "wav" })
  } catch (error) {
    console.error("Text-to-speech error:", error)
    // Return success with fallback flag so client uses browser TTS
    return NextResponse.json({ error: "Failed to generate speech", useBrowserTTS: true }, { status: 200 })
  }
}
