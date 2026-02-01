import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizationPerson {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  partner_id: string | null;
}

export function useOrganizationPeople(organizationId: string) {
  const { data: people = [], isLoading, isError, error } = useQuery({
    queryKey: ['organization-people', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .select('id, name, email, phone, job_title, partner_id')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data as OrganizationPerson[];
    },
    enabled: !!organizationId,
  });

  return {
    people,
    isLoading,
    isError,
    error,
  };
}
