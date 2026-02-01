-- Add partner_id column to people table to link with organization partners
ALTER TABLE public.people ADD COLUMN partner_id UUID REFERENCES public.organization_partners(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_people_partner_id ON public.people(partner_id);

-- Add comment for documentation
COMMENT ON COLUMN public.people.partner_id IS 'Reference to organization partner from RF enrichment data';