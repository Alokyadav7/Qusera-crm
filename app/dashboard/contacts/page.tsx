import { createClient } from '@/lib/supabase/server'
import { ContactsPageClient } from './contacts-page-client'

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .is('deleted_at', null as any)
    .order('created_at', { ascending: false })

  return <ContactsPageClient initialContacts={(contacts as any) ?? []} />
}
