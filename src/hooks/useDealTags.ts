import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DealTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  created_by: string | null;
}

export interface DealTagAssignment {
  id: string;
  deal_id: string;
  tag_id: string;
  created_at: string;
  tag?: DealTag;
}

export const TAG_COLORS = [
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Cinza', value: '#6b7280' },
] as const;

export function useDealTags() {
  return useQuery({
    queryKey: ['deal-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as DealTag[];
    },
  });
}

export function useDealTagAssignments(dealId: string | undefined) {
  return useQuery({
    queryKey: ['deal-tag-assignments', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      
      const { data, error } = await supabase
        .from('deal_tag_assignments')
        .select(`
          id,
          deal_id,
          tag_id,
          created_at,
          tag:deal_tags(*)
        `)
        .eq('deal_id', dealId);
      
      if (error) throw error;
      return data as (DealTagAssignment & { tag: DealTag })[];
    },
    enabled: !!dealId,
  });
}

export function useCreateDealTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('deal_tags')
        .insert({
          name: name.trim(),
          color,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as DealTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-tags'] });
    },
  });
}

export function useAssignDealTags() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ dealId, tagIds }: { dealId: string; tagIds: string[] }) => {
      await supabase
        .from('deal_tag_assignments')
        .delete()
        .eq('deal_id', dealId);
      
      if (tagIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('deal_tag_assignments')
        .insert(
          tagIds.map(tagId => ({
            deal_id: dealId,
            tag_id: tagId,
          }))
        )
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deal-tag-assignments', variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal'] });
    },
  });
}

export function useRemoveDealTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ dealId, tagId }: { dealId: string; tagId: string }) => {
      const { error } = await supabase
        .from('deal_tag_assignments')
        .delete()
        .eq('deal_id', dealId)
        .eq('tag_id', tagId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deal-tag-assignments', variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useUpdateDealTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { data, error } = await supabase
        .from('deal_tags')
        .update({ name: name.trim(), color })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as DealTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-tags'] });
      queryClient.invalidateQueries({ queryKey: ['deal-tag-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useDeleteDealTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('deal_tags')
        .delete()
        .eq('id', tagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-tags'] });
      queryClient.invalidateQueries({ queryKey: ['deal-tag-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
