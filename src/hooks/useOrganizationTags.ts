import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OrganizationTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  created_by: string | null;
}

export interface OrganizationTagAssignment {
  id: string;
  organization_id: string;
  tag_id: string;
  created_at: string;
  tag?: OrganizationTag;
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

export function useOrganizationTags() {
  return useQuery({
    queryKey: ['organization-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as OrganizationTag[];
    },
  });
}

export function useOrganizationTagAssignments(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-tag-assignments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('organization_tag_assignments')
        .select(`
          id,
          organization_id,
          tag_id,
          created_at,
          tag:organization_tags(*)
        `)
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      return data as (OrganizationTagAssignment & { tag: OrganizationTag })[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateOrganizationTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('organization_tags')
        .insert({
          name: name.trim(),
          color,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as OrganizationTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-tags'] });
    },
  });
}

export function useAssignOrganizationTags() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ organizationId, tagIds }: { organizationId: string; tagIds: string[] }) => {
      await supabase
        .from('organization_tag_assignments')
        .delete()
        .eq('organization_id', organizationId);
      
      if (tagIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('organization_tag_assignments')
        .insert(
          tagIds.map(tagId => ({
            organization_id: organizationId,
            tag_id: tagId,
          }))
        )
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-tag-assignments', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}

export function useRemoveOrganizationTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ organizationId, tagId }: { organizationId: string; tagId: string }) => {
      const { error } = await supabase
        .from('organization_tag_assignments')
        .delete()
        .eq('organization_id', organizationId)
        .eq('tag_id', tagId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-tag-assignments', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useUpdateOrganizationTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { data, error } = await supabase
        .from('organization_tags')
        .update({ name: name.trim(), color })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as OrganizationTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-tags'] });
      queryClient.invalidateQueries({ queryKey: ['organization-tag-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useDeleteOrganizationTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('organization_tags')
        .delete()
        .eq('id', tagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-tags'] });
      queryClient.invalidateQueries({ queryKey: ['organization-tag-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
