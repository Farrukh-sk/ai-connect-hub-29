
-- Align schema with requested column names
ALTER TABLE public.clients RENAME COLUMN name TO business_name;
ALTER TABLE public.conversations RENAME COLUMN phone TO customer_phone;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS leads_client_id_idx ON public.leads(client_id);
