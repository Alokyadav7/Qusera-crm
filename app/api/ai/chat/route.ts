import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const CRM_SYSTEM_PROMPT = `You are OrbitCRM AI, an expert sales intelligence assistant embedded inside a CRM platform called OrbitCRM. 

You help sales teams with:
- Lead prioritization and scoring
- Deal strategy and negotiation advice  
- Email and follow-up drafting
- Pipeline health analysis
- Revenue forecasting
- Customer sentiment analysis
- Sales coaching and objection handling

Always give concise, actionable, specific responses. Use bullet points for lists. 
Format numbers as Indian currency (₹) when relevant. Keep responses focused and under 200 words unless explicitly asked for more detail.
Be direct, confident, and data-driven in your analysis.`

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json()

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('replace_with')) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured. Add your key to .env file.' },
        { status: 500 }
      )
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      systemInstruction: CRM_SYSTEM_PROMPT + (context ? `\n\nCurrent CRM Context:\n${context}` : ''),
    })

    // Build chat history (all but last message)
    // Gemini requires history to start with a 'user' message — drop any leading model turns
    const rawHistory = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const firstUserIdx = rawHistory.findIndex((m: { role: string }) => m.role === 'user')
    const history = firstUserIdx > 0 ? rawHistory.slice(firstUserIdx) : rawHistory

    const chat = model.startChat({ history })
    const lastMessage = messages[messages.length - 1]

    // Stream the response
    const result = await chat.sendMessageStream(lastMessage.content)

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
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
    const message = err instanceof Error ? err.message : 'AI request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
