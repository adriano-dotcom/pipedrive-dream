
-- Tabela de Pipelines (funis de venda)
CREATE TABLE public.pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    owner_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de Stages (etapas do funil)
CREATE TABLE public.stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT DEFAULT '#6366f1',
    probability INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de Deals (negócios)
CREATE TABLE public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    value DECIMAL(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    owner_id UUID,
    created_by UUID,
    
    -- Campos específicos de seguros
    insurance_type TEXT,
    start_date DATE,
    end_date DATE,
    insurer TEXT,
    commission_percent DECIMAL(5,2),
    commission_value DECIMAL(15,2),
    policy_number TEXT,
    
    -- Status e controle
    status TEXT DEFAULT 'open' NOT NULL,
    probability INTEGER DEFAULT 0,
    expected_close_date DATE,
    won_at TIMESTAMPTZ,
    lost_at TIMESTAMPTZ,
    lost_reason TEXT,
    
    label TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes para performance
CREATE INDEX idx_deals_pipeline_id ON public.deals(pipeline_id);
CREATE INDEX idx_deals_stage_id ON public.deals(stage_id);
CREATE INDEX idx_deals_organization_id ON public.deals(organization_id);
CREATE INDEX idx_deals_person_id ON public.deals(person_id);
CREATE INDEX idx_deals_status ON public.deals(status);
CREATE INDEX idx_stages_pipeline_id ON public.stages(pipeline_id);

-- Enable RLS
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- RLS Policies para pipelines
CREATE POLICY "Authenticated users can view all pipelines"
ON public.pipelines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert pipelines"
ON public.pipelines FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update pipelines"
ON public.pipelines FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete pipelines"
ON public.pipelines FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para stages
CREATE POLICY "Authenticated users can view all stages"
ON public.stages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert stages"
ON public.stages FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update stages"
ON public.stages FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete stages"
ON public.stages FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para deals
CREATE POLICY "Authenticated users can view all deals"
ON public.deals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert deals"
ON public.deals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update deals"
ON public.deals FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete deals"
ON public.deals FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_pipelines_updated_at
    BEFORE UPDATE ON public.pipelines
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stages_updated_at
    BEFORE UPDATE ON public.stages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir Pipeline padrão com etapas
INSERT INTO public.pipelines (id, name, description, is_default)
VALUES ('00000000-0000-0000-0000-000000000001', 'Pipeline Principal', 'Funil de vendas padrão', true);

INSERT INTO public.stages (pipeline_id, name, position, color, probability) VALUES
('00000000-0000-0000-0000-000000000001', 'Em Cotação', 1, '#3b82f6', 10),
('00000000-0000-0000-0000-000000000001', 'Retorno', 2, '#eab308', 25),
('00000000-0000-0000-0000-000000000001', 'Proposta', 3, '#f97316', 50),
('00000000-0000-0000-0000-000000000001', 'Apresentar', 4, '#8b5cf6', 70),
('00000000-0000-0000-0000-000000000001', 'Negociação', 5, '#22c55e', 90),
('00000000-0000-0000-0000-000000000001', 'Fechado', 6, '#16a34a', 100);
