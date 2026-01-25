import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fireConfetti } from '@/lib/confetti';

export interface DealHistory {
  id: string;
  deal_id: string;
  event_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  profile?: { full_name: string } | null;
}

export interface DealNote {
  id: string;
  deal_id: string;
  content: string;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string } | null;
}

export function useDealDetails(dealId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch deal with all relations
  const { data: deal, isLoading: isLoadingDeal } = useQuery({
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

  // Fetch all stages for the pipeline
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

  // Fetch deal history
  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['deal-history', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_history')
        .select('*')
        .eq('deal_id', dealId)
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
        })) as DealHistory[];
      }

      return data as DealHistory[];
    },
    enabled: !!dealId,
  });

  // Fetch deal notes
  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ['deal-notes', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_notes')
        .select('*')
        .eq('deal_id', dealId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for notes
      const creatorIds = [...new Set(data.map(n => n.created_by).filter(Boolean))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', creatorIds as string[]);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(n => ({
          ...n,
          profile: n.created_by ? profileMap.get(n.created_by) : null,
        })) as DealNote[];
      }

      return data as DealNote[];
    },
    enabled: !!dealId,
  });

  // Fetch deal activities
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['deal-activities', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', dealId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('deal_notes')
        .insert({
          deal_id: dealId,
          content,
          created_by: user?.id,
        });

      if (error) throw error;

      // Also add to history
      await supabase.from('deal_history').insert({
        deal_id: dealId,
        event_type: 'note_added',
        description: 'Nota adicionada',
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deal-history', dealId] });
      toast.success('Nota adicionada');
    },
    onError: () => {
      toast.error('Erro ao adicionar nota');
    },
  });

  // Toggle note pin mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('deal_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', dealId] });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('deal_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', dealId] });
      toast.success('Nota excluída');
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      const { error } = await supabase
        .from('deal_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', dealId] });
      toast.success('Nota atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar nota');
    },
  });

  // Update deal stage mutation
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

  // Mark deal as won/lost
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

      // Add to history
      await supabase.from('deal_history').insert({
        deal_id: dealId,
        event_type: status === 'won' ? 'deal_won' : 'deal_lost',
        description: status === 'won' ? 'Negócio ganho! 🎉' : 'Negócio perdido',
        new_value: status === 'lost' ? lostReason : null,
        metadata: status === 'lost' && lostReason ? { reason: lostReason } : {},
        created_by: user?.id,
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deal-history', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      
      if (status === 'won') {
        fireConfetti();
        toast.success('🎉 Parabéns! Negócio ganho!');
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
    addNote: addNoteMutation.mutate,
    isAddingNote: addNoteMutation.isPending,
    togglePin: togglePinMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    isUpdatingNote: updateNoteMutation.isPending,
    updateStage: updateStageMutation.mutate,
    updateDealStatus: updateDealStatusMutation.mutate,
    isUpdatingStatus: updateDealStatusMutation.isPending,
  };
}
