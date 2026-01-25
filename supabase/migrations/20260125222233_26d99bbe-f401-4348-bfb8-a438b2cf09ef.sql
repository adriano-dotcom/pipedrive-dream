-- Create email_templates table for saved email templates
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sent_emails table for email history
CREATE TABLE public.sent_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('deal', 'person', 'organization')),
    entity_id UUID NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT,
    to_email TEXT NOT NULL,
    to_name TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_signatures table for user email signatures
CREATE TABLE public.user_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    signature_html TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Users can view global templates or own templates"
ON public.email_templates FOR SELECT
USING (is_global = true OR created_by = auth.uid());

CREATE POLICY "Users can create own templates"
ON public.email_templates FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates"
ON public.email_templates FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own templates or admins"
ON public.email_templates FOR DELETE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- RLS Policies for sent_emails
CREATE POLICY "Users can view all sent emails"
ON public.sent_emails FOR SELECT
USING (true);

CREATE POLICY "Users can create sent email records"
ON public.sent_emails FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- RLS Policies for user_signatures
CREATE POLICY "Users can view own signature"
ON public.user_signatures FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own signature"
ON public.user_signatures FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signature"
ON public.user_signatures FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_sent_emails_entity ON public.sent_emails(entity_type, entity_id);
CREATE INDEX idx_sent_emails_created_by ON public.sent_emails(created_by);
CREATE INDEX idx_email_templates_created_by ON public.email_templates(created_by);
CREATE INDEX idx_email_templates_global ON public.email_templates(is_global) WHERE is_global = true;