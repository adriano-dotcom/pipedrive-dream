
-- Add email_status to people
ALTER TABLE public.people ADD COLUMN email_status text NOT NULL DEFAULT 'active';

-- Create bulk_email_campaigns
CREATE TABLE public.bulk_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  opened_count int NOT NULL DEFAULT 0,
  rate_limit int NOT NULL DEFAULT 10,
  daily_limit int,
  scheduled_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own campaigns" ON public.bulk_email_campaigns FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can view own campaigns or admins" ON public.bulk_email_campaigns FOR SELECT USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own campaigns or admins" ON public.bulk_email_campaigns FOR UPDATE USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own campaigns or admins" ON public.bulk_email_campaigns FOR DELETE USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bulk_email_campaigns_updated_at BEFORE UPDATE ON public.bulk_email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create bulk_email_recipients
CREATE TABLE public.bulk_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.bulk_email_campaigns(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  opened_at timestamptz,
  error_message text,
  tracking_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_email_recipients ENABLE ROW LEVEL SECURITY;

-- RLS via campaign ownership
CREATE POLICY "Users can view recipients of own campaigns" ON public.bulk_email_recipients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bulk_email_campaigns c WHERE c.id = campaign_id AND (c.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);
CREATE POLICY "Users can insert recipients for own campaigns" ON public.bulk_email_recipients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bulk_email_campaigns c WHERE c.id = campaign_id AND c.created_by = auth.uid())
);
CREATE POLICY "Users can update recipients of own campaigns" ON public.bulk_email_recipients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.bulk_email_campaigns c WHERE c.id = campaign_id AND (c.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);

-- Index for tracking pixel lookups
CREATE INDEX idx_bulk_email_recipients_tracking_id ON public.bulk_email_recipients(tracking_id);
CREATE INDEX idx_bulk_email_recipients_campaign_status ON public.bulk_email_recipients(campaign_id, status);
