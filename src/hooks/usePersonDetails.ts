import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PersonHistory {
  id: string;
  person_id: string;
  event_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  profile?: { full_name: string } | null;
}

export interface PersonNote {
  id: string;
  person_id: string;
  content: string;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string } | null;
}

export interface PersonActivity {
  id: string;
  title: string;
  activity_type: string;
  due_date: string;
  due_time: string | null;
  is_completed: boolean;
  completed_at: string | null;
  priority: string | null;
  description: string | null;
}

export interface PersonDeal {
  id: string;
  title: string;
  value: number | null;
  status: string;
  stage: { name: string; color: string | null } | null;
  pipeline: { name: string } | null;
  created_at: string;
}

export interface UsePersonDetailsOptions {
  loadHistory?: boolean;
  loadNotes?: boolean;
  loadActivities?: boolean;
  loadDeals?: boolean;
}

export function usePersonDetails(personId: string, options?: UsePersonDetailsOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Default all options to true for backwards compatibility
  const { 
    loadHistory = true, 
    loadNotes = true, 
    loadActivities = true, 
    loadDeals = true 
  } = options || {};

  // Fetch person with related data - always loads immediately
  const { data: person, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['person', personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .select(`
          *,
          organization:organizations!people_organization_id_fkey(
            id, name, cnpj, address_city, address_state
          )
        `)
        .eq('id', personId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!personId,
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch person history - lazy loaded based on active tab
  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['person-history', personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people_history')
        .select('*')
        .eq('person_id', personId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for history entries
      const creatorIds = [...new Set(data.map(h => h.created_by).filter(Boolean))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', creatorIds as string[]);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(h => ({
          ...h,
          profile: h.created_by ? profileMap.get(h.created_by) : null,
        })) as PersonHistory[];
      }

      return data as PersonHistory[];
    },
    enabled: !!personId && loadHistory,
    staleTime: 30000,
  });

  // Fetch person notes - lazy loaded based on active tab
  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ['person-notes', personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people_notes')
        .select('*')
        .eq('person_id', personId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const creatorIds = [...new Set(data.map(n => n.created_by).filter(Boolean))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', creatorIds as string[]);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(n => ({
          ...n,
          is_pinned: n.is_pinned ?? false,
          profile: n.created_by ? profileMap.get(n.created_by) : null,
        })) as PersonNote[];
      }

      return data.map(n => ({ ...n, is_pinned: n.is_pinned ?? false })) as PersonNote[];
    },
    enabled: !!personId && loadNotes,
    staleTime: 30000,
  });

  // Fetch activities linked to this person - lazy loaded based on active tab
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['person-activities', personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, activity_type, due_date, due_time, is_completed, completed_at, priority, description')
        .eq('person_id', personId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as PersonActivity[];
    },
    enabled: !!personId && loadActivities,
    staleTime: 30000,
  });

  // Fetch deals linked to this person - lazy loaded based on active tab
  const { data: deals = [], isLoading: isLoadingDeals } = useQuery({
    queryKey: ['person-deals', personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id, title, value, status, created_at,
          stage:stages(name, color),
          pipeline:pipelines(name)
        `)
        .eq('person_id', personId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PersonDeal[];
    },
    enabled: !!personId && loadDeals,
    staleTime: 30000,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('people_notes').insert({
        person_id: personId,
        content,
        created_by: user.id,
      });

      if (error) throw error;

      // Log to history
      await supabase.from('people_history').insert({
        person_id: personId,
        event_type: 'note_added',
        description: 'Nova nota adicionada',
        created_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-notes', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-history', personId] });
      toast.success('Nota adicionada!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar nota: ' + error.message);
    },
  });

  // Toggle pin mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('people_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-notes', personId] });
    },
    onError: (error) => {
      toast.error('Erro ao fixar nota: ' + error.message);
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('people_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-notes', personId] });
      toast.success('Nota excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir nota: ' + error.message);
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      const { error } = await supabase
        .from('people_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-notes', personId] });
      toast.success('Nota atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar nota: ' + error.message);
    },
  });

  return {
    person,
    history,
    notes,
    activities,
    deals,
    isLoading,
    isLoadingHistory,
    isLoadingNotes,
    isLoadingActivities,
    isLoadingDeals,
    isError,
    error,
    refetch,
    addNote: addNoteMutation.mutate,
    isAddingNote: addNoteMutation.isPending,
    togglePin: (noteId: string, isPinned: boolean) => togglePinMutation.mutate({ noteId, isPinned }),
    deleteNote: deleteNoteMutation.mutate,
    updateNote: (noteId: string, content: string) => updateNoteMutation.mutate({ noteId, content }),
    isUpdatingNote: updateNoteMutation.isPending,
  };
}
