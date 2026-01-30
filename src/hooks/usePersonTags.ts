import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PersonTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  created_by: string | null;
}

export interface PersonTagAssignment {
  id: string;
  person_id: string;
  tag_id: string;
  created_at: string;
  tag?: PersonTag;
}

// Cores disponíveis para etiquetas
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

// Hook para buscar todas as tags disponíveis
export function usePersonTags() {
  return useQuery({
    queryKey: ['person-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('person_tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as PersonTag[];
    },
  });
}

// Hook para buscar tags atribuídas a uma pessoa específica
export function usePersonTagAssignments(personId: string | undefined) {
  return useQuery({
    queryKey: ['person-tag-assignments', personId],
    queryFn: async () => {
      if (!personId) return [];
      
      const { data, error } = await supabase
        .from('person_tag_assignments')
        .select(`
          id,
          person_id,
          tag_id,
          created_at,
          tag:person_tags(*)
        `)
        .eq('person_id', personId);
      
      if (error) throw error;
      return data as (PersonTagAssignment & { tag: PersonTag })[];
    },
    enabled: !!personId,
  });
}

// Hook para criar uma nova tag
export function useCreatePersonTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('person_tags')
        .insert({
          name: name.trim(),
          color,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as PersonTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-tags'] });
    },
  });
}

// Hook para atribuir tags a uma pessoa
export function useAssignPersonTags() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ personId, tagIds }: { personId: string; tagIds: string[] }) => {
      // Primeiro, remove todas as tags existentes
      await supabase
        .from('person_tag_assignments')
        .delete()
        .eq('person_id', personId);
      
      // Se não há tags para adicionar, retorna
      if (tagIds.length === 0) return [];
      
      // Adiciona as novas tags
      const { data, error } = await supabase
        .from('person_tag_assignments')
        .insert(
          tagIds.map(tagId => ({
            person_id: personId,
            tag_id: tagId,
          }))
        )
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['person-tag-assignments', variables.personId] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
    },
  });
}

// Hook para remover uma tag de uma pessoa
export function useRemovePersonTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ personId, tagId }: { personId: string; tagId: string }) => {
      const { error } = await supabase
        .from('person_tag_assignments')
        .delete()
        .eq('person_id', personId)
        .eq('tag_id', tagId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['person-tag-assignments', variables.personId] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
