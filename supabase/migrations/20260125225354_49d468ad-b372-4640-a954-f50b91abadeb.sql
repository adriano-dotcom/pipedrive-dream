-- Adicionar constraint UNIQUE na coluna email
-- Permite valores NULL (múltiplas pessoas sem email)
-- Mas impede duplicação quando email está preenchido
ALTER TABLE public.people
ADD CONSTRAINT people_email_unique UNIQUE (email);