# Klinq CRM — System Architecture & Documentation

This document describes the technical architecture, data models, and system flows of the Klinq Customer Relationship Management (CRM) platform.

---

## 🏗️ System Architecture Overview

Klinq CRM is structured as a **Multi-Tenant Software-as-a-Service (SaaS)** system using Next.js on the frontend and Supabase as the serverless backend.

```
┌────────────────────────────────────────────────────────┐
│                      Next.js App                       │
│    (Dashboard, Pipelines, Invoicing, Automations)      │
└──────────────────────────┬─────────────────────────────┘
                           │ Authenticated APIs / Hooks
                           ▼
┌────────────────────────────────────────────────────────┐
│                        Supabase                        │
│    (Auth, PostgreSQL, Row-Level Security, Realtime)    │
└────────────────────────────────────────────────────────┘
```

### Technology Stack
* **Frontend**: Next.js (App Router, Turbopack)
* **Styling**: Tailwind CSS & Radix UI (via Shadcn)
* **Database**: PostgreSQL (hosted on Supabase)
* **Authentication**: Supabase SSR (Session & Cookie authentication)
* **Realtime**: Supabase Postgres Changes Channel for live dashboard updates
* **AI Engine**: Google Gemini API for analytics insights & summaries

---

## 🗄️ Database Schemas (Supabase PostgreSQL)

The backend is built around a multi-tenant PostgreSQL schema. Every tenant-specific table contains a `company_id` column, backed by Row Level Security (RLS).

### Core Tables

#### 1. Tenants & Membership
* **`companies`**: Stores organization profiles (name, slug, logo URL).
* **`company_members`**: Join table mapping `profiles` to `companies` with a role (`admin`, `manager`, `executive`, `viewer`).
* **`user_active_company`**: Tracks which workspace (company) the user is currently operating in.
* **`invites`**: Stores invitation tokens sent to new team members.

#### 2. CRM Business Entities
* **`contacts`**: Stores prospect and customer information (name, email, phone, stage).
* **`deals`**: Pipeline opportunities linked to contacts, tracking estimated deal value and status.
* **`tasks`**: Follow-ups, reminders, and user tasks linked to leads.
* **`crm_invoices`**: Billing items, subtotal, tax configurations, and PDF-ready items.

#### 3. Communication & Logging
* **`emails`**: Logged email messages (inbound & outbound) with open-tracking logs.
* **`interactions`**: Phone call records, notes, and custom activities.
* **`automations` & `automation_logs`**: Define trigger-action workflows (e.g. notify rep on new lead) and trace execution.

---

## 🔒 Security & Middleware Authorization

### Tenant Isolation
Authorization is managed at two levels:
1. **Next.js Middleware (`withTenantAuth.ts`)**: Prevents users from accessing dashboard pages or API routes of companies they do not belong to.
2. **Database Row Level Security (RLS)**: PostgreSQL policies automatically filter all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations using the client session context (`auth.uid()`).

```sql
-- Example RLS Policy for Contacts
CREATE POLICY "Users can only read contacts of their active company"
ON public.contacts
FOR SELECT
USING (
  company_id = (SELECT company_id FROM public.user_active_company WHERE user_id = auth.uid())
);
```

---

## 🚀 Key Feature Flows

### 1. Embedded WhatsApp Signup
* Integrates with the Meta Business API.
* Allows companies to onboard their own phone numbers directly through embedded OAuth windows.
* Keeps company phone numbers, webhooks, and messages completely isolated per tenant.

### 2. AI Analytics Insights
* An analytics command center utilizes **Google Gemini** models to analyze raw deal pipelines and tasks.
* Generates proactive recommendations, flags stale leads, and estimates quarterly revenues.

### 3. Subscriptions & Billing
* Subscriptions are handled via **Razorpay**, syncing invoice logs with client state tables.
* Webhook routing is secured via signed secrets, automatically upgrading or suspending features as payments succeed or fail.
