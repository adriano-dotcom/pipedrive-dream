-- Adicionar constraint UNIQUE na coluna cpf
-- Permite valores NULL (múltiplas pessoas sem cpf)
-- Mas impede duplicação quando cpf está preenchido
ALTER TABLE public.people
ADD CONSTRAINT people_cpf_unique UNIQUE (cpf);