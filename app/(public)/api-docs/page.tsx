import type { Metadata } from 'next'
import { ApiDocsClient } from './api-docs-client'

export const metadata: Metadata = {
  title: 'API Reference — Klinq CRM',
  description: 'Integrate Klinq CRM into your product. REST API documentation for Leads, Contacts, and Deals — secured with API key authentication.',
}

export default function ApiDocsPage() {
  return <ApiDocsClient />
}
