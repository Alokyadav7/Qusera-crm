# Klinq CRM — Implementation & Setup Guide

This guide walks you through setting up, configuring, and deploying Klinq CRM in development and production environments.

---

## 🛠️ Step 1: Database Setup (Supabase)

Klinq CRM relies heavily on Supabase for data persistence, authentication, and RLS policies. Follow these steps to initialize your database:

1. Create a new project in the [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor** in your Supabase project.
3. Execute the SQL migration scripts located in the `supabase/` folder in the following order:
   * **Core Schemas**: `supabase/multi-tenant-core.sql`
   * **Policies**: `supabase/rls-policies.sql`
   * **Invoicing**: `supabase/INVOICES-MIGRATION.sql`
   * **Billing & Subs**: `supabase/subscriptions-billing.sql`
   * **Job Queues**: `supabase/job-queue.sql`
   * **Feature Flags**: `supabase/feature-flags.sql`
   * **Auditing**: `supabase/PRODUCTION-AUDIT.sql`
4. Enable RLS verification by executing `supabase/verify-rls.sql` or `scripts/verify-rls.sql` in the SQL editor.

---

## 🔑 Step 2: Environment Variables (`.env.local`)

Copy `.env.example` to `.env.local` in your project root and populate the following values:

```ini
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

# Gmail SMTP Configuration (For outgoing invitation/auth emails)
GMAIL_USER=klinqcrm@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx # 16-character Google app password
EMAIL_FROM_NAME=Klinq CRM

# Gemini AI Integration (For lead scoring & insights)
GEMINI_API_KEY=your-gemini-api-key-here

# Razorpay Integration (Live credentials for production, Test for dev)
RAZORPAY_KEY_ID=rzp_live_yourkeyid
RAZORPAY_KEY_SECRET=yourkeysecrethere
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_yourkeyid
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Meta Developer Credentials (For WhatsApp Business API)
NEXT_PUBLIC_META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_SYSTEM_USER_TOKEN=your-meta-system-user-token
WHATSAPP_VERIFY_TOKEN=your_whatsapp_verify_token
```

> [!NOTE]
> To generate a Gmail App Password, enable **2-Step Verification** on your Google Account, navigate to Security → App Passwords, and generate a new password under the app type "Mail".

---

## 🚀 Step 3: Deployment

### Hosting on Vercel (Recommended)

1. Push your repository to GitHub/GitLab.
2. Link the repository to [Vercel](https://vercel.com).
3. In the project settings, add all the environment variables defined in your `.env.local`.
4. Configure the **Build Settings**:
   * Build Command: `npm run build`
   * Output Directory: `.next`
5. Click **Deploy**.

### Webhook Configuration
Once your frontend is deployed, you must configure the incoming webhooks:
* **Razorpay Dashboard**: Add a new webhook in the settings tab pointing to `https://yourdomain.com/api/billing/webhook`. Enable `payment.captured` and `payment.failed` event subscriptions.
* **Meta App Dashboard**: Configure Webhooks for WhatsApp under your Meta app. Set the Callback URL to `https://yourdomain.com/api/webhooks/whatsapp` and matching Verify Token to the `WHATSAPP_VERIFY_TOKEN` configured in `.env.local`.

---

## 👥 Step 4: Admin Initialization

To access the Super-Admin command center and initialize your platform's first company account:

1. Register a standard user account on the login/signup page.
2. In the Supabase SQL editor, run the following script (replacing with your user's email) to grant Super-Admin privileges:
   ```sql
   -- Assign Super Admin role
   UPDATE public.profiles
   SET role = 'super-admin'
   WHERE email = 'your-admin-email@domain.com';
   ```
3. Log in. You will now see the `/super-admin` portal where you can onboard new companies, manage subscriptions, view usage tracking, and toggle global feature flags.
