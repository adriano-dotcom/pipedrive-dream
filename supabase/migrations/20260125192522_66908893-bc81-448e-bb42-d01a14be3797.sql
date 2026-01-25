-- Create storage bucket for deal files
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-files', 'deal-files', false);

-- Storage policies: Authenticated users can upload deal files
CREATE POLICY "Authenticated users can upload deal files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deal-files');

-- Storage policies: Authenticated users can view deal files
CREATE POLICY "Authenticated users can view deal files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'deal-files');

-- Storage policies: Users can delete own files or admins can delete any
CREATE POLICY "Users can delete own files or admins"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-files' AND 
  (auth.uid()::text = (storage.foldername(name))[2] OR has_role(auth.uid(), 'admin'::app_role))
);

-- Create deal_files table for metadata
CREATE TABLE public.deal_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;

-- RLS: View deal files (all authenticated users)
CREATE POLICY "Authenticated users can view deal files"
ON public.deal_files FOR SELECT
TO authenticated
USING (true);

-- RLS: Insert deal files (own uploads)
CREATE POLICY "Authenticated users can insert deal files"
ON public.deal_files FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- RLS: Delete own files or admin
CREATE POLICY "Users can delete own files or admins"
ON public.deal_files FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));