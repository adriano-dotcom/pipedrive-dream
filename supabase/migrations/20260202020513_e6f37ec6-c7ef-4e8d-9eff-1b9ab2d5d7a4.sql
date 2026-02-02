-- Adicionar campos de contato à tabela organization_partners
ALTER TABLE organization_partners 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT;