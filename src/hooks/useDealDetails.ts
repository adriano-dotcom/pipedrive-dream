import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fireConfetti } from '@/lib/confetti';
import { fetchNotes, createNote, updateNote, deleteNote, toggleNotePin, type Note } from '@/services/noteService';
import { fetchHistory, addHistoryEntry, type HistoryEntry } from '@/services/historyService';
import { getErrorMessage } from '@/services/supabaseErrors';

export type DealHistory = HistoryEntry & { deal_id: string };
export type DealNote = Note & { deal_id: string };

export function useDealDetails(dealId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: deal, isLoading: isLoadingDeal, isError: isDealError, error: dealError } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          organization:organizations(id, name, phone, email),
          person:people(id, name, phone, email, job_title),
          stage:stages(id, name, color, position, probability),
          pipeline:pipelines(id, name)
        `)
        .eq('id', dealId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages', deal?.pipeline_id],
    queryFn: async () => {
      if (!deal?.pipeline_id) return [];
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('pipeline_id', deal.pipeline_id)
        .order('position');

      if (error) throw error;
      return data;
    },
    enabled: !!deal?.pipeline_id,
  });

  const { data: history = [], isLoading: isLoadingHistory, isError: isHistoryError } = useQuery({
    queryKey: ['deal-history', dealId],
    queryFn: () => fetchHistory('deal', dealId, 100),
    enabled: !!dealId,
  });

  const { data: notes = [], isLoading: isLoadingNotes, isError: isNotesError } = useQuery({
    queryKey: ['deal-notes', dealId],
    queryFn: () => fetchNotes('deal', dealId),
    enabled: !!dealId,
  });

  const { data: activities = [], isLoading: isLoadingActivities, isError: isActivitiesError } = useQuery({
    queryKey: ['deal-activities', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', dealId)
        .order('due_date', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });

  const toggleActivityMutation = useMutation({
    mutationFn: async ({ activityId, completed }: { activityId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('activities')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null,
        })
        .eq('id', activityId);

      if (error) throw error;
      return { completed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-activities', dealId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      await createNote('deal', dealId, content, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deal-history', dealId] });
      toast.success('Nota adicionada');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      await toggleNotePin('deal', noteId, isPinned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', dealId] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await deleteNote('deal', noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', dealId] });
      toast.success('Nota excluída');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      await updateNote('deal', noteId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', dealId] });
      toast.success('Nota atualizada');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: stageId })
        .eq('id', dealId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deal-history', dealId] });
      toast.success('Etapa atualizada');
    },
  });

  const updateDealStatusMutation = useMutation({
    mutationFn: async ({ status, lostReason }: { status: 'won' | 'lost'; lostReason?: string }) => {
      const updates: Record<string, unknown> = {
        status,
        [status === 'won' ? 'won_at' : 'lost_at']: new Date().toISOString(),
      };

      if (status === 'lost' && lostReason) {
        updates.lost_reason = lostReason;
      }

      const { error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', dealId);

      if (error) throw error;

      await addHistoryEntry('deal', dealId, {
        event_type: status === 'won' ? 'deal_won' : 'deal_lost',
        description: status === 'won' ? 'Negócio ganho!' : 'Negócio perdido',
        new_value: status === 'lost' ? lostReason ?? null : null,
        metadata: status === 'lost' && lostReason ? { reason: lostReason } : {},
        created_by: user?.id ?? null,
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deal-history', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });

      if (status === 'won') {
        fireConfetti();
        toast.success('Parabéns! Negócio ganho!');
      } else {
        toast.success('Negócio marcado como perdido');
      }
    },
  });

  return {
    deal,
    stages,
    history,
    notes,
    activities,
    isLoading: isLoadingDeal || isLoadingHistory || isLoadingNotes || isLoadingActivities,
    isError: isDealError || isHistoryError || isNotesError || isActivitiesError,
    error: dealError,
    addNote: addNoteMutation.mutate,
    isAddingNote: addNoteMutation.isPending,
    togglePin: togglePinMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    isUpdatingNote: updateNoteMutation.isPending,
    updateStage: updateStageMutation.mutate,
    updateDealStatus: updateDealStatusMutation.mutate,
    isUpdatingStatus: updateDealStatusMutation.isPending,
    toggleActivity: toggleActivityMutation.mutateAsync,
    isTogglingActivity: toggleActivityMutation.isPending,
  };
}
