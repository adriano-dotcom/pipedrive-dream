
ALTER TABLE public.bulk_email_recipients
ADD COLUMN organization_name text,
ADD COLUMN organization_city text,
ADD COLUMN job_title text;
