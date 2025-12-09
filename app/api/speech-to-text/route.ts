import { type NextRequest, NextResponse } from "next/server"

const HF_API_BASE = "https://router.huggingface.co/hf-inference/models"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as Blob

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const audioBuffer = await audioFile.arrayBuffer()

    // Use HuggingFace Router API with Whisper
    const response = await fetch(`${HF_API_BASE}/openai/whisper-large-v3`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY || ""}`,
        "Content-Type": "audio/wav",
      },
      body: audioBuffer,
    })

    if (!response.ok) {
      // If rate limited or model loading, try smaller model
      const fallbackResponse = await fetch(`${HF_API_BASE}/openai/whisper-small`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY || ""}`,
          "Content-Type": "audio/wav",
        },
        body: audioBuffer,
      })

      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text()
        console.error("HuggingFace STT error:", errorText)
        return NextResponse.json({ error: "Speech recognition failed", details: errorText }, { status: 500 })
      }

      const fallbackData = await fallbackResponse.json()
      return NextResponse.json({ text: fallbackData.text || "" })
    }

    const data = await response.json()
    return NextResponse.json({ text: data.text || "" })
  } catch (error) {
    console.error("Speech-to-text error:", error)
    return NextResponse.json({ error: "Failed to process audio" }, { status: 500 })
  }
}
