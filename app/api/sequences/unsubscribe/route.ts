import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/sequences/unsubscribe?token=xxx
 * Sets enrollment status to 'unsubscribed' and shows confirmation page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse('<html><body><p>Invalid unsubscribe link.</p></body></html>', {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const [enrollmentId, type] = decoded.split(':')

    if (type !== 'unsub' || !enrollmentId) {
      throw new Error('Invalid token')
    }

    const supabase = createServiceClient()
    await (supabase as any).from('sequence_enrollments')
      .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      .eq('id', enrollmentId)

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: white; border-radius: 16px; padding: 48px 40px; text-align: center; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    h1 { font-size: 24px; margin: 0 0 8px; }
    p { color: #6b7280; margin: 0; line-height: 1.6; }
    .icon { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Unsubscribed</h1>
    <p>You've been removed from this email sequence and won't receive any further emails.</p>
  </div>
</body>
</html>`

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
  } catch {
    return new NextResponse(
      '<html><body><p>Invalid or expired unsubscribe link.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
