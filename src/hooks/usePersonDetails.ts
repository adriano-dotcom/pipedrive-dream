import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchNotes, createNote, updateNote, deleteNote, toggleNotePin, type Note } from '@/services/noteService';
import { fetchHistory, type HistoryEntry } from '@/services/historyService';
import { getErrorMessage } from '@/services/supabaseErrors';

export type PersonHistory = HistoryEntry & { person_id: string };
export type PersonNote = Note & { person_id: string };

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

  const {
    loadHistory = true,
    loadNotes = true,
    loadActivities = true,
    loadDeals = true
  } = options || {};

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
    staleTime: 30000,
  });

  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['person-history', personId],
    queryFn: async () => {
      const data = await fetchHistory('person', personId, 100);
      return data as PersonHistory[];
    },
    enabled: !!personId && loadHistory,
    staleTime: 30000,
  });

  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ['person-notes', personId],
    queryFn: async () => {
      const data = await fetchNotes('person', personId);
      return data as PersonNote[];
    },
    enabled: !!personId && loadNotes,
    staleTime: 30000,
  });

  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['person-activities', personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, activity_type, due_date, due_time, is_completed, completed_at, priority, description')
        .eq('person_id', personId)
        .order('due_date', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data as PersonActivity[];
    },
    enabled: !!personId && loadActivities,
    staleTime: 30000,
  });

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
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PersonDeal[];
    },
    enabled: !!personId && loadDeals,
    staleTime: 30000,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      await createNote('person', personId, content, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-notes', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-history', personId] });
      toast.success('Nota adicionada!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      await toggleNotePin('person', noteId, isPinned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-notes', personId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await deleteNote('person', noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-notes', personId] });
      toast.success('Nota excluída');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      await updateNote('person', noteId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-notes', personId] });
      toast.success('Nota atualizada!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
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
