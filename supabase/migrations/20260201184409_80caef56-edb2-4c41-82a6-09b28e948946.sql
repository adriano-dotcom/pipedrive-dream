-- ===========================================
-- Migration: Add organization enrichment fields and partners table
-- ===========================================

-- 1. Add new columns to organizations table for RF data
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trade_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS branch_type text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_nature_code text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_nature text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS founded_date date;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS share_capital numeric;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS registration_status text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS registration_status_date date;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_enriched_at timestamp with time zone;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enrichment_source text;

-- 2. Create organization_partners table (Quadro Societário)
CREATE TABLE IF NOT EXISTS organization_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  document text,
  qualification text,
  qualification_code integer,
  entry_date date,
  country text,
  legal_rep_name text,
  legal_rep_document text,
  legal_rep_qualification text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create index for fast lookup by organization
CREATE INDEX IF NOT EXISTS idx_organization_partners_org_id 
  ON organization_partners(organization_id);

-- 4. Enable RLS on organization_partners
ALTER TABLE organization_partners ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for organization_partners
CREATE POLICY "Authenticated users can view organization partners" 
  ON organization_partners FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert organization partners" 
  ON organization_partners FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update organization partners" 
  ON organization_partners FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete organization partners" 
  ON organization_partners FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));