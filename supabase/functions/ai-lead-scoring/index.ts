// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { record, old_record, type } = await req.json()

    // Setup Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (type === 'DELETE') {
      return new Response(JSON.stringify({ message: 'Ignore delete' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Check if ai_scoring_enabled feature flag is enabled for company
    const { data: enabled } = await supabase.rpc('check_feature', {
      p_company_id: record.company_id,
      p_feature_key: 'ai_scoring_enabled'
    })

    if (!enabled) {
      return new Response(JSON.stringify({ message: 'AI lead scoring is disabled' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Calculate AI score (0-100) using Gemini, falling back to rule-based logic if it fails or times out.
    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GEMINI_KEY')
    let score = 0
    let usedGemini = false

    if (geminiKey && !geminiKey.includes('replace_with') && geminiKey.length >= 10) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an AI lead scoring engine. Score this lead's purchase intent and qualification from 0 to 100 based on their CRM data.
                      Lead Name: ${record.full_name || 'Unknown'}
                      Buying Intent: ${record.buying_intent || 'medium'}
                      Source: ${record.source || 'manual'}
                      Estimated Budget: ${record.estimated_budget || 0}
                      Deal Value: ${record.deal_value || 0}
                      Sentiment Score: ${record.sentiment_score || 0}
                      Status: ${record.status || 'new'}
                      Company: ${record.company || 'Unknown'}
                      City/State: ${record.city || ''}, ${record.state || ''}

                      Return a JSON object containing "score" (integer 0-100) and "reasoning" (string).`
                    }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'OBJECT',
                  properties: {
                    score: {
                      type: 'INTEGER',
                      description: 'A score from 0 to 100 representing the lead\'s quality/intent.'
                    },
                    reasoning: {
                      type: 'STRING',
                      description: 'Short explanation.'
                    }
                  },
                  required: ['score', 'reasoning']
                }
              }
            }),
            signal: controller.signal
          }
        )
        clearTimeout(timeoutId)

        if (response.ok) {
          const resData = await response.json()
          const text = resData.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            const parsed = JSON.parse(text)
            if (typeof parsed.score === 'number') {
              score = Math.max(0, Math.min(100, Math.round(parsed.score)))
              usedGemini = true
              console.log(`[ai-lead-scoring] Gemini score: ${score}, reasoning: ${parsed.reasoning}`)
            }
          }
        } else {
          console.warn(`[ai-lead-scoring] Gemini API response error: ${response.status}`)
        }
      } catch (err: any) {
        console.warn('[ai-lead-scoring] Gemini API failed or timed out:', err?.message || err)
      }
    } else {
      console.warn('[ai-lead-scoring] GEMINI_API_KEY not configured or invalid')
    }

    if (!usedGemini) {
      console.log('[ai-lead-scoring] Using rule-based fallback logic')
      let fallbackScore = 10

      if (record.buying_intent === 'high') fallbackScore += 30
      else if (record.buying_intent === 'medium') fallbackScore += 15
      else fallbackScore += 5

      const val = record.deal_value || record.estimated_budget || 0
      if (val >= 500000) fallbackScore += 25
      else if (val >= 100000) fallbackScore += 15

      if (record.source === 'referral') fallbackScore += 25
      else if (record.source === 'website') fallbackScore += 15
      else fallbackScore += 10

      if (record.sentiment_score >= 0.3) fallbackScore += 10
      else if (record.sentiment_score <= -0.3) fallbackScore -= 10

      score = Math.max(0, Math.min(100, fallbackScore))
    }

    // Update lead record
    await supabase
      .from('leads')
      .update({ 
        ai_score: score,
        ai_score_updated_at: new Date().toISOString()
      })
      .eq('id', record.id)

    return new Response(JSON.stringify({ success: true, score }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
