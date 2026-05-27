-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: notifications table + lead_score_history table
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. NOTIFICATIONS TABLE
-- Real DB-backed notifications with read/unread state, type, and metadata.
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN (
                 'lead_assigned', 'task_created', 'task_due', 'whatsapp_reply',
                 'missed_followup', 'status_change', 'ai_alert', 'mention',
                 'automation', 'lead_hot', 'compliance_alert'
               )),
  title        text NOT NULL,
  message      text,
  is_read      boolean DEFAULT false,
  lead_id      uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  task_id      uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast unread counts
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LEAD SCORE HISTORY TABLE
-- Stores each scoring event with the score, reasons, and delta vs previous.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_score_history (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id        uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score          integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  previous_score integer CHECK (previous_score BETWEEN 0 AND 100),
  delta          integer GENERATED ALWAYS AS (score - COALESCE(previous_score, score)) STORED,
  tier           text CHECK (tier IN ('hot', 'warm', 'cold', 'lost')),
  reasons        jsonb DEFAULT '[]',   -- Array of { label, weight, detail } objects
  triggered_by   text,                -- e.g. 'whatsapp_reply', 'manual', 'auto_rescore'
  created_at     timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.lead_score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own score history"
  ON public.lead_score_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for trend queries (latest scores per lead)
CREATE INDEX IF NOT EXISTS lead_score_history_lead_idx
  ON public.lead_score_history (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lead_score_history_user_idx
  ON public.lead_score_history (user_id, created_at DESC);
