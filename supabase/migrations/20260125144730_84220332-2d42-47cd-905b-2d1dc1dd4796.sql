-- Tabela de Atividades
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Tipo de atividade: task, call, meeting, email, deadline
    activity_type TEXT NOT NULL DEFAULT 'task',
    
    -- Vinculações (todas opcionais)
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Agendamento
    due_date DATE NOT NULL,
    due_time TIME,
    duration_minutes INTEGER,
    
    -- Status
    is_completed BOOLEAN DEFAULT false NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    
    -- Atribuição
    assigned_to UUID,
    owner_id UUID,
    created_by UUID,
    
    -- Prioridade: low, normal, high
    priority TEXT DEFAULT 'normal',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes para performance
CREATE INDEX idx_activities_due_date ON public.activities(due_date);
CREATE INDEX idx_activities_assigned_to ON public.activities(assigned_to);
CREATE INDEX idx_activities_deal_id ON public.activities(deal_id);
CREATE INDEX idx_activities_person_id ON public.activities(person_id);
CREATE INDEX idx_activities_organization_id ON public.activities(organization_id);
CREATE INDEX idx_activities_is_completed ON public.activities(is_completed);
CREATE INDEX idx_activities_activity_type ON public.activities(activity_type);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view all activities"
ON public.activities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert activities"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update activities"
ON public.activities FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() OR assigned_to = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete activities"
ON public.activities FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();