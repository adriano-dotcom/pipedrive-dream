import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateData {
  status?: 'pending' | 'in_progress' | 'resolved' | 'archived';
  assigned_to?: string | null;
  priority?: number;
  tags?: string[];
  resolved_at?: string | null;
  first_response_at?: string | null;
}

interface UpdateParams {
  conversationId: string;
  data: UpdateData;
  personId?: string;
}

export function useUpdateWhatsAppConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, data }: UpdateParams) => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update(data)
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate conversation queries
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', variables.conversationId] });
      
      // If personId is provided, also invalidate person-specific queries
      if (variables.personId) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', 'person', variables.personId] });
      }

      if (variables.data.status === 'resolved') {
        toast.success('Conversa resolvida', {
          description: 'A conversa foi marcada como resolvida',
        });
      }
    },
    onError: (error) => {
      console.error('Error updating conversation:', error);
      toast.error('Erro ao atualizar conversa', {
        description: 'Tente novamente',
      });
    },
  });
}
