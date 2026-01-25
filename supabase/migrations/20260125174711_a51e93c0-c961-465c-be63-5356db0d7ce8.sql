-- Add primary_contact_id to organizations table
ALTER TABLE public.organizations
ADD COLUMN primary_contact_id uuid REFERENCES public.people(id) ON DELETE SET NULL;