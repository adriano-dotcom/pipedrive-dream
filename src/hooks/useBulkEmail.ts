import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateCampaignParams {
  subject: string;
  body: string;
  recipients: { person_id: string; email: string; name: string }[];
  rateLimit?: number;
  scheduledAt?: string | null;
}

export function useBulkEmail() {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['bulk-email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_email_campaigns' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (params: CreateCampaignParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('bulk_email_campaigns' as any)
        .insert({
          subject: params.subject,
          body: params.body,
          status: 'queued',
          total_recipients: params.recipients.length,
          rate_limit: params.rateLimit || 10,
          scheduled_at: params.scheduledAt || null,
          created_by: session.user.id,
        } as any)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create recipients
      const recipientRows = params.recipients.map((r) => ({
        campaign_id: (campaign as any).id,
        person_id: r.person_id,
        email: r.email,
        name: r.name,
        status: 'pending',
      }));

      const { error: recipientError } = await supabase
        .from('bulk_email_recipients' as any)
        .insert(recipientRows as any);

      if (recipientError) throw recipientError;

      // Trigger processing
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-bulk-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ campaign_id: (campaign as any).id }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao processar campanha');
      }

      return campaign;
    },
    onSuccess: () => {
      toast.success('Campanha de e-mail criada e envio iniciado!');
      queryClient.invalidateQueries({ queryKey: ['bulk-email-campaigns'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar campanha');
    },
  });

  const getCampaignRecipients = async (campaignId: string) => {
    const { data, error } = await supabase
      .from('bulk_email_recipients' as any)
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as any[];
  };

  // Continue processing a campaign (for remaining recipients)
  const continueProcessing = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-bulk-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ campaign_id: campaignId }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao continuar processamento');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-email-campaigns'] });
    },
  });

  return {
    campaigns,
    campaignsLoading,
    createCampaign: createCampaignMutation.mutateAsync,
    isCreating: createCampaignMutation.isPending,
    getCampaignRecipients,
    continueProcessing: continueProcessing.mutateAsync,
    isContinuing: continueProcessing.isPending,
  };
}
