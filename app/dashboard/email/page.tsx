import { createServiceClient } from '@/lib/supabase/service'
import { EmailPageClient } from './email-page-client'

export default async function EmailPage() {
  const supabase = createServiceClient()
  const { data: emails } = await (supabase as any)
    .from('emails')
    .select('*, contact:contacts(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  return <EmailPageClient initialEmails={emails ?? []} />
}
