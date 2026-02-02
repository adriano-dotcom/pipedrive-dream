-- Add notes column to organization_partners table
ALTER TABLE organization_partners
ADD COLUMN notes text DEFAULT NULL;