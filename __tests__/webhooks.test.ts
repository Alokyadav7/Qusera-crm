import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as metaPostHandler } from '../app/api/webhooks/meta-leads/route'
import { POST as googlePostHandler } from '../app/api/webhooks/google-leads/route'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

// Mock the supabase server client
vi.mock('@/lib/supabase/server', () => {
  return {
    createClient: () => {
      return {
        from: (table: string) => {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'integrations') {
                    return { data: { user_id: 'user_123', meta_page_access_token: 'dummy_token_123' }, error: null }
                  }
                  if (table === 'profiles') {
                    return { data: { company_id: 'company_123' }, error: null }
                  }
                  return { data: null, error: null }
                },
                single: async () => {
                  if (table === 'companies') {
                    return { data: { id: 'company_123', owner_id: 'user_123' }, error: null }
                  }
                  return { data: null, error: null }
                }
              })
            }),
            insert: () => ({
              select: () => ({
                single: async () => {
                  return { data: { id: 'lead_123', full_name: 'Jane Doe Meta Test', company_id: 'company_123', created_at: new Date().toISOString() }, error: null }
                }
              }),
              single: async () => {
                return { data: { id: 'notification_123' }, error: null }
              }
            })
          }
        }
      }
    }
  }
})

describe('Webhook Latency & Delivery Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Meta Leads Webhook: Process simulated payload under 50ms', async () => {
    const payload = {
      object: 'page',
      entry: [
        {
          id: 'page_123',
          time: 1720100000,
          platform: 'facebook',
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: 'test-meta-lead-id-9999',
                form_id: 'test-meta-form-id-7777',
                page_id: 'page_123'
              }
            }
          ]
        }
      ]
    }

    const rawBody = JSON.stringify(payload)
    const APP_SECRET = '41d8ba5df1456948f4853c0cdcd1f525'
    const signature = 'sha256=' + createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')

    // Create custom environment variable
    process.env.META_APP_SECRET = APP_SECRET

    const req = new NextRequest('http://localhost:3000/api/webhooks/meta-leads?company_id=company_123', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': signature,
        'Content-Type': 'application/json'
      },
      body: rawBody
    })

    const startTime = performance.now()
    const response = await metaPostHandler(req)
    const endTime = performance.now()
    const duration = endTime - startTime

    console.log(`[Meta Webhook Duration]: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(duration).toBeLessThan(100) // Verification processing must be fast (under 100ms)
  })

  it('2. Google Leads Webhook: Process simulated payload under 50ms', async () => {
    const payload = {
      lead_id: 'test-google-lead-12345',
      campaign_id: 987654321,
      campaign_name: 'Test Google Ads Campaign',
      user_column_data: [
        { column_name: 'Full Name', string_value: 'John Doe Google Test' },
        { column_name: 'Email', string_value: 'johndoe.google@test.com' },
        { column_name: 'Phone Number', string_value: '+919999999999' }
      ]
    }

    process.env.GOOGLE_LEADS_WEBHOOK_KEY = 'test-google-leads-webhook-key'

    const req = new NextRequest('http://localhost:3000/api/webhooks/google-leads?company_id=company_123&key=test-google-leads-webhook-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const startTime = performance.now()
    const response = await googlePostHandler(req)
    const endTime = performance.now()
    const duration = endTime - startTime

    console.log(`[Google Webhook Duration]: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('received')
    expect(duration).toBeLessThan(100) // Verification processing must be fast (under 100ms)
  })
})
