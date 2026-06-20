import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'

export const POST = withTenantAuth(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json()
      const { apiKey, phoneNumber } = body

      if (!apiKey) {
        return NextResponse.json({ error: 'API Key is required' }, { status: 400 })
      }

      // Fast2SMS verification call
      try {
        const testPhone = phoneNumber || '9999999999'
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: '1234',
            numbers: testPhone,
          }),
        })

        const data = await res.json()

        if (res.status === 200 && data.return === true) {
          return NextResponse.json({ success: true, message: 'Fast2SMS credentials verified successfully!' })
        } else {
          return NextResponse.json({ success: false, error: data.message ?? 'Verification failed (Fast2SMS returned error)' })
        }
      } catch (err: any) {
        return NextResponse.json({ success: false, error: 'Network request failed: ' + (err.message ?? 'Check your API Key') })
      }
    } catch (err: any) {
      console.error('[SMS Test Error]:', err)
      return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
    }
  },
  { requiredRoles: ['owner', 'admin'] }
)
