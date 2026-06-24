
-- Clients additions
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- Drop old messages table (we replace conversations model)
DROP TABLE IF EXISTS public.messages;

-- Reshape conversations into WhatsApp message log
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS ai_reply TEXT;

ALTER TABLE public.conversations ALTER COLUMN title DROP NOT NULL;

-- Leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS requirement TEXT;
