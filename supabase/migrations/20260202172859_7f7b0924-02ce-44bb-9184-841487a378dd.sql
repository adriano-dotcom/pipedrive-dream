-- Add WhatsApp column to organization_partners table
ALTER TABLE organization_partners 
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;