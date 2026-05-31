import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { fullName, companyName, workEmail, phone, teamSize, industry, message } = await req.json()

    if (!fullName || !companyName || !workEmail || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 1. Save to contact_submissions (record keeping)
    await (supabase as any).from('contact_submissions').insert({
      full_name: fullName,
      company_name: companyName,
      work_email: workEmail,
      phone,
      team_size: teamSize,
      industry,
      message
    })

    // 2. Also insert into demo_requests so it appears in the super-admin panel
    const { error: demoErr } = await (supabase as any).from('demo_requests').insert({
      name: fullName,
      email: workEmail,
      phone,
      company_name: companyName,
      team_size: teamSize,
      intent: 'contact',
      message: `[Industry: ${industry || 'N/A'}]\n\n${message || ''}`.trim(),
      status: 'pending',
    })

    if (demoErr) {
      console.error('demo_requests insert failed:', demoErr)
    }

    // 3. Send email to klinqcrm@gmail.com
    const emailSubject = `New Contact Request — ${companyName}`
    const emailHtml = `
      <h2 style="margin:0 0 16px">New Contact Form Submission</h2>
      <table cellpadding="6" style="font-size:13px;border-collapse:collapse">
        <tr><td><strong>Name</strong></td><td>${fullName}</td></tr>
        <tr><td><strong>Company</strong></td><td>${companyName}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${workEmail}">${workEmail}</a></td></tr>
        <tr><td><strong>Phone</strong></td><td>${phone}</td></tr>
        <tr><td><strong>Team Size</strong></td><td>${teamSize || 'N/A'}</td></tr>
        <tr><td><strong>Industry</strong></td><td>${industry || 'N/A'}</td></tr>
      </table>
      ${message ? `<p style="margin-top:16px"><strong>Message:</strong></p>
      <blockquote style="background:#f4f4f5;border-left:3px solid #d4d4d8;padding:10px;margin:0">
        ${message.replace(/\n/g, '<br />')}
      </blockquote>` : ''}
    `

    await sendEmail({
      to: 'klinqcrm@gmail.com',
      subject: emailSubject,
      html: emailHtml,
      replyTo: workEmail
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Contact API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
