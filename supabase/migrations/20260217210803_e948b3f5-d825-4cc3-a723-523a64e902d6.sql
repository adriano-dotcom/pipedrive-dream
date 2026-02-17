CREATE INDEX IF NOT EXISTS idx_organizations_name_trgm 
  ON public.organizations USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_organizations_cnpj_trgm 
  ON public.organizations USING gin (cnpj gin_trgm_ops);