-- Tabela de histórico de eventos do negócio
CREATE TABLE public.deal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'stage_change', 'created', 'note_added', 'activity_completed', 'field_updated'
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para deal_history
ALTER TABLE public.deal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deal history"
ON public.deal_history FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert deal history"
ON public.deal_history FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Tabela de notas do negócio
CREATE TABLE public.deal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para deal_notes
ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deal notes"
ON public.deal_notes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert deal notes"
ON public.deal_notes FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update deal notes"
ON public.deal_notes FOR UPDATE
USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete deal notes"
ON public.deal_notes FOR DELETE
USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_deal_notes_updated_at
BEFORE UPDATE ON public.deal_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para registrar mudança de etapa automaticamente
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    SELECT name INTO old_stage_name FROM stages WHERE id = OLD.stage_id;
    SELECT name INTO new_stage_name FROM stages WHERE id = NEW.stage_id;
    
    INSERT INTO deal_history (deal_id, event_type, description, old_value, new_value, created_by)
    VALUES (
      NEW.id,
      'stage_change',
      'Etapa alterada: ' || COALESCE(old_stage_name, 'N/A') || ' → ' || COALESCE(new_stage_name, 'N/A'),
      old_stage_name,
      new_stage_name,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para mudança de etapa
CREATE TRIGGER deal_stage_change_trigger
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_stage_change();

-- Função para registrar criação do negócio
CREATE OR REPLACE FUNCTION public.log_deal_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO deal_history (deal_id, event_type, description, created_by)
  VALUES (
    NEW.id,
    'created',
    'Negócio criado',
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

-- Trigger para criação do negócio
CREATE TRIGGER deal_creation_trigger
AFTER INSERT ON deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_creation();