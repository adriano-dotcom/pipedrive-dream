-- Create merge_backups table for undo functionality
CREATE TABLE public.merge_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization')),
  kept_entity_id UUID NOT NULL,
  deleted_entity_id UUID NOT NULL,
  deleted_entity_data JSONB NOT NULL,
  kept_entity_previous_data JSONB NOT NULL,
  transferred_relations JSONB NOT NULL DEFAULT '{}',
  merged_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  is_restored BOOLEAN DEFAULT false
);

-- Regular index for lookups (without time-based condition)
CREATE INDEX idx_merge_backups_lookup ON public.merge_backups (kept_entity_id, entity_type, is_restored);

-- Enable RLS
ALTER TABLE public.merge_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view merge backups" ON public.merge_backups
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert backups" ON public.merge_backups
  FOR INSERT WITH CHECK (auth.uid() = merged_by);

CREATE POLICY "Users can update own backups or admins" ON public.merge_backups
  FOR UPDATE USING (auth.uid() = merged_by OR has_role(auth.uid(), 'admin'::app_role));