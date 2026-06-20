import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'
import nodemailer from 'nodemailer'

export const POST = withTenantAuth(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json()
      const { host, port, secure, user, pass } = body

      if (!host || !port || !user || !pass) {
        return NextResponse.json({ error: 'host, port, user, and pass are required' }, { status: 400 })
      }

      const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: !!secure,
        auth: { user, pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
      })

      try {
        await transporter.verify()
        return NextResponse.json({ success: true, message: 'SMTP credentials verified successfully!' })
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message ?? 'Verification failed' })
      }
    } catch (err: any) {
      console.error('[SMTP Test Error]:', err)
      return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
    }
  },
  { requiredRoles: ['owner', 'admin'] }
)
