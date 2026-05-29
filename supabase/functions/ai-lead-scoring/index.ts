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

    // Calculate AI score (0-100) based on logic:
    // 1. Buying Intent: high (+30), medium (+15), low (+5)
    // 2. Budget: value > 500,000 (+25), value > 100,000 (+15)
    // 3. Source Quality: website (+15), referral (+25), manual (+10)
    // 4. Sentiment score: positive (+10), negative (-10)
    let score = 10

    if (record.buying_intent === 'high') score += 30
    else if (record.buying_intent === 'medium') score += 15
    else score += 5

    const val = record.deal_value || record.estimated_budget || 0
    if (val >= 500000) score += 25
    else if (val >= 100000) score += 15

    if (record.source === 'referral') score += 25
    else if (record.source === 'website') score += 15
    else score += 10

    if (record.sentiment_score >= 0.3) score += 10
    else if (record.sentiment_score <= -0.3) score -= 10

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score))

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
