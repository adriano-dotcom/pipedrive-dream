-- Create people_notes table
CREATE TABLE public.people_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.people_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view people notes" ON public.people_notes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert people notes" ON public.people_notes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners and admins can update people notes" ON public.people_notes FOR UPDATE USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can delete people notes" ON public.people_notes FOR DELETE USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Create people_files table
CREATE TABLE public.people_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.people_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view people files" ON public.people_files FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert people files" ON public.people_files FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete own files or admins" ON public.people_files FOR DELETE USING ((uploaded_by = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Create people_history table
CREATE TABLE public.people_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.people_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view people history" ON public.people_history FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert people history" ON public.people_history FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Create storage bucket for people files
INSERT INTO storage.buckets (id, name, public) VALUES ('people-files', 'people-files', false);

-- Storage policies
CREATE POLICY "Auth users can upload people files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'people-files');
CREATE POLICY "Auth users can read people files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'people-files');
CREATE POLICY "Users can delete people files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'people-files');