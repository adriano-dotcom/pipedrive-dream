-- Tabela de etiquetas para pessoas
CREATE TABLE public.person_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de relacionamento N:N entre pessoas e tags
CREATE TABLE public.person_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.person_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(person_id, tag_id)
);

-- Índices para performance
CREATE INDEX idx_person_tag_assignments_person ON public.person_tag_assignments(person_id);
CREATE INDEX idx_person_tag_assignments_tag ON public.person_tag_assignments(tag_id);

-- Habilitar RLS
ALTER TABLE public.person_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para person_tags
CREATE POLICY "Users can view all tags" 
ON public.person_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tags" 
ON public.person_tags 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update tags" 
ON public.person_tags 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tags" 
ON public.person_tags 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para person_tag_assignments
CREATE POLICY "Users can view all tag assignments" 
ON public.person_tag_assignments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tag assignments" 
ON public.person_tag_assignments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tag assignments" 
ON public.person_tag_assignments 
FOR DELETE 
USING (auth.uid() IS NOT NULL);