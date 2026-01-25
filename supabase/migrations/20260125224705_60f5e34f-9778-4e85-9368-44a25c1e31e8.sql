-- Adicionar constraint UNIQUE na coluna cnpj
-- Permite valores NULL (multiplas organizacoes sem CNPJ)
-- Mas impede duplicacao quando CNPJ esta preenchido
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_cnpj_unique UNIQUE (cnpj);