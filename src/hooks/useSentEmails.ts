import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SentEmail {
  id: string;
  entity_type: string;
  entity_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  body: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  created_by: string | null;
  created_at: string;
}

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  entityType: 'deal' | 'person' | 'organization';
  entityId: string;
}

export function useSentEmails(entityType: 'deal' | 'person' | 'organization', entityId: string) {
  const queryClient = useQueryClient();

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['sent-emails', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sent_emails')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as SentEmail[];
    },
    enabled: !!entityId,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (params: SendEmailParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Você precisa estar logado para enviar emails');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar email');
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Email enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['sent-emails', entityType, entityId] });
    },
    onError: (error: Error) => {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Erro ao enviar email');
    },
  });

  return {
    emails,
    isLoading,
    sendEmail: sendEmailMutation.mutateAsync,
    isSending: sendEmailMutation.isPending,
  };
}
