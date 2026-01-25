-- Create organization_notes table
CREATE TABLE public.organization_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create organization_files table
CREATE TABLE public.organization_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create organization_history table
CREATE TABLE public.organization_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organization_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_notes
CREATE POLICY "Authenticated users can view organization notes"
ON public.organization_notes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert organization notes"
ON public.organization_notes FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update organization notes"
ON public.organization_notes FOR UPDATE
USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete organization notes"
ON public.organization_notes FOR DELETE
USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for organization_files
CREATE POLICY "Authenticated users can view organization files"
ON public.organization_files FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert organization files"
ON public.organization_files FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own files or admins"
ON public.organization_files FOR DELETE
USING ((uploaded_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for organization_history
CREATE POLICY "Authenticated users can view organization history"
ON public.organization_history FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert organization history"
ON public.organization_history FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Create storage bucket for organization files
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-files', 'organization-files', false);

-- Storage policies for organization-files bucket
CREATE POLICY "Authenticated users can upload organization files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'organization-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view organization files"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own organization files or admins"
ON storage.objects FOR DELETE
USING (bucket_id = 'organization-files' AND auth.role() = 'authenticated');

-- Create updated_at trigger for organization_notes
CREATE TRIGGER update_organization_notes_updated_at
BEFORE UPDATE ON public.organization_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();