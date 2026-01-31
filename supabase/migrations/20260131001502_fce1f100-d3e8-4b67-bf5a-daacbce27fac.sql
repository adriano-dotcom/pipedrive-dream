-- Organization Tags
CREATE TABLE public.organization_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE TABLE public.organization_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.organization_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, tag_id)
);

-- Deal Tags
CREATE TABLE public.deal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE TABLE public.deal_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.deal_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(deal_id, tag_id)
);

-- Indices para performance
CREATE INDEX idx_org_tag_assignments_org ON public.organization_tag_assignments(organization_id);
CREATE INDEX idx_org_tag_assignments_tag ON public.organization_tag_assignments(tag_id);
CREATE INDEX idx_deal_tag_assignments_deal ON public.deal_tag_assignments(deal_id);
CREATE INDEX idx_deal_tag_assignments_tag ON public.deal_tag_assignments(tag_id);

-- RLS
ALTER TABLE public.organization_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Policies para organization_tags
CREATE POLICY "Users can view all organization tags" 
  ON public.organization_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create organization tags" 
  ON public.organization_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update organization tags" 
  ON public.organization_tags FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete organization tags" 
  ON public.organization_tags FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Policies para organization_tag_assignments
CREATE POLICY "Users can view all organization tag assignments" 
  ON public.organization_tag_assignments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create organization tag assignments" 
  ON public.organization_tag_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete organization tag assignments" 
  ON public.organization_tag_assignments FOR DELETE USING (auth.uid() IS NOT NULL);

-- Policies para deal_tags
CREATE POLICY "Users can view all deal tags" 
  ON public.deal_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create deal tags" 
  ON public.deal_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update deal tags" 
  ON public.deal_tags FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete deal tags" 
  ON public.deal_tags FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Policies para deal_tag_assignments
CREATE POLICY "Users can view all deal tag assignments" 
  ON public.deal_tag_assignments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create deal tag assignments" 
  ON public.deal_tag_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete deal tag assignments" 
  ON public.deal_tag_assignments FOR DELETE USING (auth.uid() IS NOT NULL);