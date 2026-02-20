import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/services/supabaseErrors';

export interface WhatsAppConversationAnalysis {
  id: string;
  conversation_id: string;
  overall_score: number;
  response_quality: number;
  tone_score: number;
  resolution_effectiveness: number;
  professionalism: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string | null;
  strengths: string[];
  improvements: string[];
  message_count: number | null;
  analyzed_at: string;
  created_at: string;
}

export function useWhatsAppAnalysis(conversationId: string) {
  return useQuery({
    queryKey: ['whatsapp-analysis', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversation_analysis')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppConversationAnalysis | null;
    },
    enabled: !!conversationId,
  });
}

export function useAnalyzeWhatsAppConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.functions.invoke('analyze-whatsapp-conversation', {
        body: { conversationId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data.analysis as WhatsAppConversationAnalysis;
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-analysis', conversationId] });
      toast.success('Análise concluída', {
        description: 'A conversa foi analisada com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error analyzing conversation:', error);
      toast.error('Erro ao analisar conversa', {
        description: getErrorMessage(error),
      });
    },
  });
}
