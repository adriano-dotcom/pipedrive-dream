import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizationPartner {
  id: string;
  organization_id: string;
  name: string;
  document: string | null;
  qualification: string | null;
  qualification_code: number | null;
  entry_date: string | null;
  country: string | null;
  legal_rep_name: string | null;
  legal_rep_document: string | null;
  legal_rep_qualification: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrganizationPartners(organizationId: string) {
  const { data: partners = [], isLoading, isError, error } = useQuery({
    queryKey: ['organization-partners', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_partners')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data as OrganizationPartner[];
    },
    enabled: !!organizationId,
  });

  return {
    partners,
    isLoading,
    isError,
    error,
  };
}
