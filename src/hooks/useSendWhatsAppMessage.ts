import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendMessageParams {
  conversationId: string;
  content: string;
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content }: SendMessageParams) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: { conversationId, content },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error) => {
      console.error('Error sending WhatsApp message:', error);
      toast.error('Erro ao enviar mensagem', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    },
  });
}
