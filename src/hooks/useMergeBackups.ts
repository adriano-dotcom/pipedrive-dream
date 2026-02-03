import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MergeBackup {
  id: string;
  entity_type: 'person' | 'organization';
  kept_entity_id: string;
  deleted_entity_id: string;
  deleted_entity_data: Record<string, any>;
  kept_entity_previous_data: Record<string, any>;
  transferred_relations: TransferredRelations;
  merged_by: string | null;
  created_at: string;
  expires_at: string;
  is_restored: boolean;
}

export interface TransferredRelations {
  activities: string[];
  deals: string[];
  notes: string[];
  files: string[];
  tags: string[];
  emails: string[];
  orgs_primary_contact?: string[];
  people?: string[]; // For organizations - people linked to the deleted org
}

export function useMergeBackups(entityId: string, entityType: 'person' | 'organization') {
  return useQuery({
    queryKey: ['merge-backups', entityId, entityType],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('merge_backups')
        .select('*')
        .eq('kept_entity_id', entityId)
        .eq('entity_type', entityType)
        .eq('is_restored', false)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      return (data?.[0] ?? null) as unknown as MergeBackup | null;
    },
    enabled: !!entityId,
  });
}

export function useAllMergeBackups(entityType?: 'person' | 'organization') {
  return useQuery({
    queryKey: ['merge-backups', 'all', entityType],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      // RLS now restricts to user's own merges OR admins see all
      let query = supabase
        .from('merge_backups')
        .select('*')
        .eq('is_restored', false)
        .gt('expires_at', now)
        .order('created_at', { ascending: false });

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []) as unknown as MergeBackup[];
    },
  });
}
