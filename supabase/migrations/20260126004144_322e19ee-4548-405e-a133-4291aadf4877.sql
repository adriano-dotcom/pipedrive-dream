-- Add column for user's default pipeline preference
ALTER TABLE public.profiles 
ADD COLUMN default_pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL;