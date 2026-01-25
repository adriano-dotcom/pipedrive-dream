-- Add insurance-specific fields to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS insurance_branches TEXT[];
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS preferred_insurers TEXT[];
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS fleet_type TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS fleet_size INTEGER;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS current_insurer TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS policy_renewal_month INTEGER;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS annual_premium_estimate NUMERIC;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS risk_profile TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS has_claims_history BOOLEAN DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS broker_notes TEXT;