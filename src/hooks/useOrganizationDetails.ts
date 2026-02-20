import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchNotes, createNote, updateNote, deleteNote, toggleNotePin, type Note } from '@/services/noteService';
import { fetchHistory, type HistoryEntry } from '@/services/historyService';
import { getErrorMessage } from '@/services/supabaseErrors';

export type OrganizationHistory = HistoryEntry & { organization_id: string };
export type OrganizationNote = Note & { organization_id: string };

export interface OrganizationActivity {
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

export interface OrganizationDeal {
  id: string;
  title: string;
  value: number | null;
  status: string;
  stage: { name: string; color: string | null } | null;
  pipeline: { name: string } | null;
  created_at: string;
}

export interface OrganizationPerson {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  job_title: string | null;
  is_primary: boolean;
}

export function useOrganizationDetails(organizationId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: organization, isLoading, isError: isOrgError, error: orgError } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          primary_contact:people!primary_contact_id(
            id, name, email, phone, whatsapp, job_title
          )
        `)
        .eq('id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: people = [], isError: isPeopleError } = useQuery({
    queryKey: ['organization-people', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .select('id, name, email, phone, whatsapp, job_title')
        .eq('organization_id', organizationId)
        .order('name')
        .limit(50);

      if (error) throw error;

      return data.map(p => ({
        ...p,
        is_primary: p.id === organization?.primary_contact_id,
      })) as OrganizationPerson[];
    },
    enabled: !!organizationId && !!organization,
  });

  const { data: history = [], isError: isHistoryError } = useQuery({
    queryKey: ['organization-history', organizationId],
    queryFn: async () => {
      const data = await fetchHistory('organization', organizationId, 100);
      return data as OrganizationHistory[];
    },
    enabled: !!organizationId,
  });

  const { data: notes = [], isError: isNotesError } = useQuery({
    queryKey: ['organization-notes', organizationId],
    queryFn: async () => {
      const data = await fetchNotes('organization', organizationId);
      return data as OrganizationNote[];
    },
    enabled: !!organizationId,
  });

  const { data: activities = [], isError: isActivitiesError } = useQuery({
    queryKey: ['organization-activities', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, activity_type, due_date, due_time, is_completed, completed_at, priority, description')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data as OrganizationActivity[];
    },
    enabled: !!organizationId,
  });

  const { data: deals = [], isError: isDealsError } = useQuery({
    queryKey: ['organization-deals', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id, title, value, status, created_at,
          stage:stages(name, color),
          pipeline:pipelines(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as OrganizationDeal[];
    },
    enabled: !!organizationId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      await createNote('organization', organizationId, content, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-notes', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-history', organizationId] });
      toast.success('Nota adicionada!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      await toggleNotePin('organization', noteId, isPinned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-notes', organizationId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await deleteNote('organization', noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-notes', organizationId] });
      toast.success('Nota excluída');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      await updateNote('organization', noteId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-notes', organizationId] });
      toast.success('Nota atualizada!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return {
    organization,
    people,
    history,
    notes,
    activities,
    deals,
    isLoading,
    isError: isOrgError || isPeopleError || isHistoryError || isNotesError || isActivitiesError || isDealsError,
    error: orgError,
    addNote: addNoteMutation.mutate,
    isAddingNote: addNoteMutation.isPending,
    togglePin: (noteId: string, isPinned: boolean) => togglePinMutation.mutate({ noteId, isPinned }),
    deleteNote: deleteNoteMutation.mutate,
    updateNote: (noteId: string, content: string) => updateNoteMutation.mutate({ noteId, content }),
    isUpdatingNote: updateNoteMutation.isPending,
  };
}
