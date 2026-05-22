import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

const CRM_SYSTEM_PROMPT = `You are OrbitCRM AI, an expert sales intelligence assistant embedded inside a CRM platform called OrbitCRM, built for Indian sales teams.

You help sales teams with:
- Lead prioritization and scoring
- Deal strategy and negotiation advice
- Email and WhatsApp follow-up drafting
- Pipeline health analysis
- Revenue forecasting in Indian Rupees (₹)
- Customer sentiment analysis
- Sales coaching and objection handling
- GST, compliance, and B2B deal guidance specific to India

Always give concise, actionable, specific responses. Use bullet points for lists.
Format numbers as Indian currency (₹) when relevant. Keep responses focused and under 200 words unless explicitly asked for more detail.
Be direct, confident, and data-driven in your analysis.`

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey.includes('replace_with') || apiKey.length < 10) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured. Add your Gemini API key to the .env file.' },
        { status: 500 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    // Build system instruction with optional CRM context
    const systemInstruction = CRM_SYSTEM_PROMPT + (context ? `\n\nCurrent CRM Context:\n${context}` : '')

    // Convert message history to Gemini format (all but last message)
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    // Drop any leading model turns — Gemini requires history to start with user
    const firstUserIdx = history.findIndex((m: { role: string }) => m.role === 'user')
    const cleanHistory = firstUserIdx > 0 ? history.slice(firstUserIdx) : history

    const lastMessage = messages[messages.length - 1]

    // Use the new genai chat API with streaming
    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1024,
        systemInstruction,
      },
      history: cleanHistory,
    })

    const result = await chat.sendMessageStream({ message: lastMessage.content })

    // Stream the text chunks back to the client
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of result) {
            const text = chunk.text
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err: unknown) {
    console.error('Gemini API error:', err)
    const raw = err instanceof Error ? err.message : 'AI request failed'

    // User-friendly messages for known error types
    let message = raw
    if (raw.includes('404') || raw.includes('not found')) {
      message = 'AI model unavailable. Please verify your GEMINI_API_KEY has access to Gemini 2.0.'
    } else if (raw.includes('API_KEY') || raw.includes('403') || raw.includes('invalid')) {
      message = 'Invalid Gemini API key. Check GEMINI_API_KEY in your .env file.'
    } else if (raw.includes('429') || raw.includes('quota')) {
      message = 'Gemini API quota exceeded. Please wait a moment and try again.'
    } else if (raw.includes('SAFETY')) {
      message = 'Response blocked by safety filters. Please rephrase your question.'
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

