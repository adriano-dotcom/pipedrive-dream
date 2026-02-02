-- =====================================================
-- Performance Optimization: Indexes for 50k+ Records
-- =====================================================

-- Enable pg_trgm extension for fast ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- PHASE 1: B-tree Indexes for Sorting and Filtering
-- =====================================================

-- Organizations: Default sort order (created_at DESC)
CREATE INDEX IF NOT EXISTS idx_organizations_created_at 
  ON organizations(created_at DESC);

-- People: Default sort order (created_at DESC)
CREATE INDEX IF NOT EXISTS idx_people_created_at 
  ON people(created_at DESC);

-- Organizations: Fleet size sorting (used in insurance CRM)
CREATE INDEX IF NOT EXISTS idx_organizations_automotores 
  ON organizations(automotores DESC NULLS LAST);

-- Organizations: Partial indexes for frequent filters
CREATE INDEX IF NOT EXISTS idx_organizations_label 
  ON organizations(label) WHERE label IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_city 
  ON organizations(address_city) WHERE address_city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_state 
  ON organizations(address_state) WHERE address_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_renewal_month 
  ON organizations(policy_renewal_month) WHERE policy_renewal_month IS NOT NULL;

-- People: Partial indexes for frequent filters
CREATE INDEX IF NOT EXISTS idx_people_label 
  ON people(label) WHERE label IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_lead_source 
  ON people(lead_source) WHERE lead_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_organization_id 
  ON people(organization_id) WHERE organization_id IS NOT NULL;

-- =====================================================
-- PHASE 2: GIN Indexes for Text Search (ILIKE)
-- =====================================================

-- Organizations: Fast text search on name and cnpj
CREATE INDEX IF NOT EXISTS idx_organizations_name_gin 
  ON organizations USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_organizations_cnpj_gin 
  ON organizations USING gin (cnpj gin_trgm_ops);

-- People: Fast text search on name, email, phone
CREATE INDEX IF NOT EXISTS idx_people_name_gin 
  ON people USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_people_email_gin 
  ON people USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_people_phone_gin 
  ON people USING gin (phone gin_trgm_ops);

-- =====================================================
-- PHASE 3: Composite Index for Main Paginated Query
-- =====================================================

-- Organizations: Composite for paginated listing
CREATE INDEX IF NOT EXISTS idx_organizations_list 
  ON organizations(created_at DESC, id);

-- People: Composite for paginated listing
CREATE INDEX IF NOT EXISTS idx_people_list 
  ON people(created_at DESC, id);