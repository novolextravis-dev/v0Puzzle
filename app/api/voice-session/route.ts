import { NextResponse } from "next/server"

// This endpoint securely provides the WebSocket URL with the API key
// The API key is kept server-side and never exposed to the client
export async function POST(request: Request) {
  try {
    const { systemInstruction } = await request.json()

    // Get API key from server-side environment variable (no NEXT_PUBLIC_ prefix)
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables in the Vars section of the sidebar.",
        },
        { status: 400 },
      )
    }

    // Using v1alpha for the Live API as per Google's documentation
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`

    const config = {
      model: "models/gemini-2.0-flash-live-001",
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede",
            },
          },
        },
      },
      systemInstruction: {
        parts: [
          {
            text:
              systemInstruction ||
              `You are an expert HR Manager Assistant with a friendly, professional tone. Keep responses concise and conversational.`,
          },
        ],
      },
    }

    return NextResponse.json({
      success: true,
      wsUrl,
      config,
    })
  } catch (error) {
    console.error("Voice session error:", error)
    return NextResponse.json({ success: false, error: "Failed to create voice session" }, { status: 500 })
  }
}
