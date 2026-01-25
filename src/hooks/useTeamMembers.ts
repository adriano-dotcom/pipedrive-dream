import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url')
        .order('full_name');
      
      if (error) throw error;
      return data as TeamMember[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
