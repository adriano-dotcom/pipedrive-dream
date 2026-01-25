-- Adicionar constraint UNIQUE na coluna whatsapp
-- Permite valores NULL (múltiplas pessoas sem whatsapp)
-- Mas impede duplicação quando whatsapp está preenchido
ALTER TABLE public.people
ADD CONSTRAINT people_whatsapp_unique UNIQUE (whatsapp);