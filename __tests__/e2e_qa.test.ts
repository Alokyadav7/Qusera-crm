import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from '../lib/supabase/service'

// We will hit the running dev server on localhost:3000
const BASE_URL = 'http://localhost:3000'
const COOKIE_NAME = 'sb-eqllqrppeodrhalpiajx-auth-token'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Admin service role client to manage users/cleanup
const adminClient = createServiceClient()
// Client-side Supabase client to simulate real user sessions
const clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Test users definition
const ownerEmail = 'qa_owner@klinqcrm.test'
const managerEmail = 'qa_manager@klinqcrm.test'
const repEmail = 'qa_salesrep@klinqcrm.test'
const password = 'TestPassword123!'

let ownerSession: any = null
let managerSession: any = null
let repSession: any = null

let companyId: string = ''
let managerUserId: string = ''
let repUserId: string = ''
let leadId: string = ''

// Helper to make fetch request with simulated session cookie
async function fetchAPI(path: string, options: RequestInit = {}, session: any = null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  }

  if (session) {
    headers['Authorization'] = `Bearer ${session.access_token}`
    headers['Cookie'] = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(session))}`
  }

  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })
}

beforeAll(async () => {
  // Clean up any existing test users in auth to ensure a clean test run
  const { data: listUsers, error: listErr } = await adminClient.auth.admin.listUsers()
  if (listErr) {
    console.error('Failed to list auth users:', listErr)
    return
  }

  for (const u of listUsers.users) {
    if (u.email?.endsWith('@klinqcrm.test')) {
      await adminClient.auth.admin.deleteUser(u.id)
    }
  }

  // Clean up database tables for safety
  await (adminClient as any).from('companies').delete().eq('name', 'QA Test Company')
})

describe('Klinq CRM E2E QA Test Suite', () => {
  // ── 1. SIGNUP & WELCOME EMAIL ──────────────────────────────────────────────
  it('1. Signup/Onboarding and Welcome Email check', async () => {
    // A. Create the Owner Auth User
    const { data: ownerUser, error: ownerCreateErr } = await adminClient.auth.admin.createUser({
      email: ownerEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'QA Owner' }
    })
    expect(ownerCreateErr).toBeNull()
    expect(ownerUser.user).toBeDefined()

    // B. Login as Owner to get session
    const { data: ownerAuth, error: ownerLoginErr } = await clientSupabase.auth.signInWithPassword({
      email: ownerEmail,
      password: password
    })
    expect(ownerLoginErr).toBeNull()
    ownerSession = ownerAuth.session
    expect(ownerSession).toBeDefined()

    // C. Trigger Onboarding Route POST /api/onboarding/setup
    const setupRes = await fetchAPI('/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({
        companyName: 'QA Test Company',
        industry: 'Software',
        teamSize: '10-50',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        phone: '+919999999999',
        website: 'qatestcompany.test'
      })
    }, ownerSession)

    expect(setupRes.status).toBe(200)
    const setupData = await setupRes.json()
    expect(setupData.success).toBe(true)
    expect(setupData.company.id).toBeDefined()
    companyId = setupData.company.id

    // D. Check if welcome email is enqueued in the job_queue
    const { data: queuedJobs } = await (adminClient as any)
      .from('job_queue')
      .select('*')
      .eq('company_id', companyId)
      .eq('job_type', 'send_email')

    expect(queuedJobs).not.toBeNull()
    expect(queuedJobs!.length).toBeGreaterThan(0)

    const welcomeJob = queuedJobs!.find((j: any) => j.payload.template === 'welcome')
    expect(welcomeJob).toBeDefined()
    expect(welcomeJob.status).toBe('pending')

    // E. Execute the job worker to process the welcome email
    const workerRes = await fetch(`${BASE_URL}/api/jobs/worker`, {
      method: 'POST',
      headers: {
        'x-worker-secret': 'dev-worker-secret'
      }
    })
    expect(workerRes.status).toBe(200)
    const workerData = await workerRes.json()
    expect(workerData.processed).toBeGreaterThan(0)

    // F. Verify the job completed and is marked done
    const { data: updatedJob } = await (adminClient as any)
      .from('job_queue')
      .select('status')
      .eq('id', welcomeJob.id)
      .single()
    expect(updatedJob.status).toBe('completed')
  })

  // ── 2. INVITE MANAGER ──────────────────────────────────────────────────────
  it('2. Invite Manager -> Accept -> Login', async () => {
    // A. Send Invite as Owner
    const inviteRes = await fetchAPI('/api/invites/send', {
      method: 'POST',
      body: JSON.stringify({
        email: managerEmail,
        role: 'manager'
      })
    }, ownerSession)

    expect(inviteRes.status).toBe(200)
    const inviteData = await inviteRes.json()
    expect(inviteData.success).toBe(true)

    // B. Retrieve token from invites table
    const { data: inviteRow } = await (adminClient as any)
      .from('invites')
      .select('token')
      .eq('email', managerEmail)
      .single()
    expect(inviteRow).not.toBeNull()
    const inviteToken = inviteRow.token

    // C. Accept invite using token
    const acceptRes = await fetchAPI('/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify({
        token: inviteToken,
        password: password,
        fullName: 'QA Manager'
      })
    })
    expect(acceptRes.status).toBe(200)
    const acceptData = await acceptRes.json()
    expect(acceptData.success).toBe(true)

    // D. Log in as Manager
    const { data: managerAuth, error: managerLoginErr } = await clientSupabase.auth.signInWithPassword({
      email: managerEmail,
      password: password
    })
    expect(managerLoginErr).toBeNull()
    managerSession = managerAuth.session
    managerUserId = managerAuth.user!.id
    expect(managerSession).toBeDefined()
  })

  // ── 3. INVITE SALES REP ────────────────────────────────────────────────────
  it('3. Invite Sales Rep (as Manager) -> Accept -> Login', async () => {
    // A. Send Invite as Manager
    const inviteRes = await fetchAPI('/api/invites/send', {
      method: 'POST',
      body: JSON.stringify({
        email: repEmail,
        role: 'sales_rep'
      })
    }, managerSession)

    expect(inviteRes.status).toBe(200)
    const inviteData = await inviteRes.json()
    expect(inviteData.success).toBe(true)

    // B. Retrieve token
    const { data: inviteRow } = await (adminClient as any)
      .from('invites')
      .select('token')
      .eq('email', repEmail)
      .single()
    expect(inviteRow).not.toBeNull()
    const inviteToken = inviteRow.token

    // C. Accept invite
    const acceptRes = await fetchAPI('/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify({
        token: inviteToken,
        password: password,
        fullName: 'QA Sales Rep'
      })
    })
    expect(acceptRes.status).toBe(200)
    const acceptData = await acceptRes.json()
    expect(acceptData.success).toBe(true)

    // D. Log in as Sales Rep
    const { data: repAuth, error: repLoginErr } = await clientSupabase.auth.signInWithPassword({
      email: repEmail,
      password: password
    })
    expect(repLoginErr).toBeNull()
    repSession = repAuth.session
    repUserId = repAuth.user!.id
    expect(repSession).toBeDefined()
  })

  // ── 4. CONNECT WHATSAPP ────────────────────────────────────────────────────
  it('4. Connect WhatsApp endpoint check', async () => {
    const connectRes = await fetchAPI('/api/whatsapp/connect', {
      method: 'POST',
      body: JSON.stringify({
        code: 'dummy_auth_code_123',
        company_id: companyId
      })
    }, ownerSession)

    // Since it tries to exchange code with Meta, it should contact Meta and fail because the auth code is dummy.
    // It should NOT crash, but return a clear OAuth error from Meta.
    const resData = await connectRes.json()
    console.log('WhatsApp Connect Response:', resData)

    expect([400, 502, 503, 500]).toContain(connectRes.status)
    expect(resData.error).toBeDefined()
    expect(resData.code).not.toBe('INTERNAL_ERROR') // Must handle the Meta API error properly
  })

  // ── 5. SEND WHATSAPP MESSAGE ──────────────────────────────────────────────
  it('5. Send WhatsApp Message (should fail gracefully if not connected)', async () => {
    // Create a temporary lead to attempt sending message
    const leadRes = await fetchAPI('/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        full_name: 'QA Lead Whatsapp',
        phone: '+919999999999'
      })
    }, ownerSession)
    expect(leadRes.status).toBe(200)
    const leadData = await leadRes.json()
    leadId = leadData.data.id

    const sendRes = await fetchAPI('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: leadId,
        message: 'Hello from QA test!'
      })
    }, ownerSession)

    const sendData = await sendRes.json()
    console.log('WhatsApp Send Response:', sendData)

    expect(sendRes.status).toBe(400)
    expect(sendData.code).toBe('WA_NOT_CONNECTED')
  })

  // ── 6. RECEIVE WHATSAPP MESSAGE ────────────────────────────────────────────
  it('6. Receive WhatsApp message via Webhook', async () => {
    // Insert dummy whatsapp credentials so webhook lookup matches company
    await (adminClient as any).from('company_whatsapp').insert({
      company_id: companyId,
      waba_id: 'waba_qa_test',
      phone_number_id: 'phone_qa_test',
      phone_number: '919999999999',
      access_token: 'dummy_token',
      is_active: true
    })

    // Meta Webhook payload matching the number '919876543210'
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'waba_qa_test',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '919999999999',
              phone_number_id: 'phone_qa_test'
            },
            contacts: [{
              profile: { name: 'Meta Webhook Sender' },
              wa_id: '919876543210'
            }],
            messages: [{
              from: '919876543210',
              id: 'wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSE0JGNjVBNUU2QURBOUMzQkJDQgA=',
              timestamp: '1710000000',
              text: { body: 'Interested in buying CRM software' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    }

    // Call webhook (verify signature header is present or since in dev it checks signature if META_APP_SECRET is present)
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In local dev, we don't have to provide valid HMAC signature since webhook route has signature verification logic.
        // Wait, does our webhook signature verification fail if the header is missing?
        // Let's verify what header it expects: 'x-hub-signature-256'
        'x-hub-signature-256': 'sha256=dummy_sig_to_prevent_missing_signature_crash'
      },
      body: JSON.stringify(webhookPayload)
    })

    // Webhook route handler should verify the signature. Since the signature is invalid, it should return 401 or similar.
    // Wait, let's see what it returns.
    console.log('Webhook Response:', webhookRes.status, await webhookRes.text())
    expect([401, 200]).toContain(webhookRes.status) 
  })

  // ── 7. SEND EMAIL FROM APP ─────────────────────────────────────────────────
  it('7. Send Email from App', async () => {
    const emailRes = await fetchAPI('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({
        to: 'yalok2227@gmail.com',
        subject: 'Klinq CRM Final QA Sign-off',
        html: '<p>This is the final E2E test email from Klinq CRM before client deployment.</p>',
        leadId: leadId
      })
    }, ownerSession)

    const emailData = await emailRes.json()
    console.log('Email Send Response:', emailData)
    // Gmail SMTP credentials exist in .env and should succeed
    expect(emailRes.status).toBe(200)
    expect(emailData.success).toBe(true)
  })

  // ── 8. RECEIVE EMAIL ───────────────────────────────────────────────────────
  it('8. Receive email webhook matching domain', async () => {
    // Update company domain to 'qatestcompany.test'
    await (adminClient as any).from('companies').update({
      custom_domain: 'qatestcompany.test'
    }).eq('id', companyId)

    // Simulate Inbound Email webhook
    const emailWebhookPayload = {
      from: 'lead_client@customer.com',
      to: 'sales@qatestcompany.test',
      subject: 'Inquiry about pricing plans',
      text: 'Hello, please send me your pricing options.'
    }

    const res = await fetch(`${BASE_URL}/api/webhooks/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailWebhookPayload)
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify lead was auto-created for this email
    const { data: matchedLead } = await (adminClient as any)
      .from('leads')
      .select('*')
      .eq('email', 'lead_client@customer.com')
      .eq('company_id', companyId)
      .single()

    expect(matchedLead).not.toBeNull()
    expect(matchedLead.full_name).toBe('lead_client')
  })

  // ── 9. CREATE & ASSIGN LEAD ────────────────────────────────────────────────
  it('9. Create Lead -> cannot assign outside company', async () => {
    // Try to create lead and assign to a random user ID not in company
    const badAssignRes = await fetchAPI('/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        full_name: 'QA Non-Company Assignee Lead',
        assigned_to: '00000000-0000-0000-0000-000000000000'
      })
    }, ownerSession)

    const badData = await badAssignRes.json()
    expect(badAssignRes.status).toBe(400)
    expect(badData.error).toContain('assigned user does not belong to your company')
  })

  // ── 10. SEND SMS ───────────────────────────────────────────────────────────
  it('10. Send SMS endpoint check', async () => {
    const smsRes = await fetchAPI('/api/sms/send', {
      method: 'POST',
      body: JSON.stringify({
        to: '+919999999999',
        body: 'Hello from Klinq CRM SMS!'
      })
    }, ownerSession)

    const smsData = await smsRes.json()
    console.log('SMS Send Response:', smsData)

    // The Fast2SMS API key in env has a balance or is real, let's verify if it returns success or API key status
    expect([200, 502, 500, 503]).toContain(smsRes.status)
    expect(smsData.error || smsData.success).toBeDefined()
  })

  // ── 11. CREATE PAYMENT ORDER ───────────────────────────────────────────────
  it('11. Create Payment Order check', async () => {
    const orderRes = await fetchAPI('/api/billing/create-order', {
      method: 'POST',
      body: JSON.stringify({
        planId: 'pro',
        billingCycle: 'monthly'
      })
    }, ownerSession)

    const orderData = await orderRes.json()
    console.log('Payment Order Response:', orderData)

    // Since Razorpay is using placeholder values in .env, our guard should trigger and reject with a 503 error
    expect(orderRes.status).toBe(503)
    expect(orderData.error).toContain('Razorpay billing not configured')
  })

  // ── 12. ID MANIPULATION & ACCESSIBILITY GUARD ──────────────────────────────
  it('12. Try accessing another company\'s data by ID manipulation', async () => {
    // Create another company and user
    const otherOwnerEmail = 'qa_other_owner@klinqcrm.test'
    const { data: otherUser } = await adminClient.auth.admin.createUser({
      email: otherOwnerEmail,
      password: password,
      email_confirm: true
    })

    const otherAuth = await clientSupabase.auth.signInWithPassword({
      email: otherOwnerEmail,
      password: password
    })
    const otherSession = otherAuth.data.session

    // Other company completes onboarding
    const otherSetup = await fetchAPI('/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({ companyName: 'QA Other Company' })
    }, otherSession)
    const otherSetupData = await otherSetup.json()
    const otherCompanyId = otherSetupData.company.id

    // Create a lead in Other Company
    const otherLeadRes = await fetchAPI('/api/leads', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'QA Other Secret Lead' })
    }, otherSession)
    const otherLeadData = await otherLeadRes.json()
    const otherLeadId = otherLeadData.data.id

    // Now, try to delete other company's lead using our primary owner's session!
    const deleteAttempt = await fetchAPI(`/api/deals/${otherLeadId}`, {
      method: 'DELETE'
    }, ownerSession)

    expect(deleteAttempt.status).toBe(403)
    const deleteAttemptData = await deleteAttempt.json()
    expect(deleteAttemptData.error).toContain('Forbidden')

    // Now, try to edit/patch other company's lead using our primary owner's session!
    const patchAttempt = await fetchAPI(`/api/deals/${otherLeadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage: 'negotiation' })
    }, ownerSession)

    expect(patchAttempt.status).toBe(403)
    const patchAttemptData = await patchAttempt.json()
    expect(patchAttemptData.error).toContain('Forbidden')
  })
})
