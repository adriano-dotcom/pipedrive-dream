import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/services/supabaseErrors';

interface CreateCampaignParams {
  subject: string;
  body: string;
  recipients: {
    person_id: string;
    email: string;
    name: string;
    organization_name?: string | null;
    organization_city?: string | null;
    job_title?: string | null;
  }[];
  rateLimit?: number;
  scheduledAt?: string | null;
}

interface SaveDraftParams {
  name: string;
  recipients: {
    person_id: string;
    email: string;
    name: string;
    organization_name?: string | null;
    organization_city?: string | null;
    job_title?: string | null;
  }[];
}

interface SendCampaignParams {
  campaignId: string;
  subject: string;
  body: string;
  rateLimit?: number;
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

      const recipientRows = params.recipients.map((r) => ({
        campaign_id: (campaign as any).id,
        person_id: r.person_id,
        email: r.email,
        name: r.name,
        organization_name: r.organization_name || null,
        organization_city: r.organization_city || null,
        job_title: r.job_title || null,
        status: 'pending',
      }));

      const { error: recipientError } = await supabase
        .from('bulk_email_recipients' as any)
        .insert(recipientRows as any);

      if (recipientError) throw recipientError;

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
      toast.error(getErrorMessage(error));
    },
  });

  // Save draft campaign (no processing)
  const saveDraftMutation = useMutation({
    mutationFn: async (params: SaveDraftParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data: campaign, error: campaignError } = await supabase
        .from('bulk_email_campaigns' as any)
        .insert({
          subject: params.name,
          body: '',
          status: 'draft',
          total_recipients: params.recipients.length,
          rate_limit: 10,
          created_by: session.user.id,
        } as any)
        .select()
        .single();

      if (campaignError) throw campaignError;

      const recipientRows = params.recipients.map((r) => ({
        campaign_id: (campaign as any).id,
        person_id: r.person_id,
        email: r.email,
        name: r.name,
        organization_name: r.organization_name || null,
        organization_city: r.organization_city || null,
        job_title: r.job_title || null,
        status: 'pending',
      }));

      const { error: recipientError } = await supabase
        .from('bulk_email_recipients' as any)
        .insert(recipientRows as any);

      if (recipientError) throw recipientError;

      return campaign;
    },
    onSuccess: () => {
      toast.success('Campanha salva como rascunho!');
      queryClient.invalidateQueries({ queryKey: ['bulk-email-campaigns'] });
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Send existing campaign (update subject/body, trigger processing)
  const sendCampaignMutation = useMutation({
    mutationFn: async (params: SendCampaignParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { error: updateError } = await supabase
        .from('bulk_email_campaigns' as any)
        .update({
          subject: params.subject,
          body: params.body,
          rate_limit: params.rateLimit || 10,
          status: 'queued',
        } as any)
        .eq('id', params.campaignId);

      if (updateError) throw updateError;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-bulk-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ campaign_id: params.campaignId }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao processar campanha');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Campanha enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['bulk-email-campaigns'] });
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Delete campaign
  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('bulk_email_campaigns' as any)
        .delete()
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Campanha excluída!');
      queryClient.invalidateQueries({ queryKey: ['bulk-email-campaigns'] });
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error));
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
    saveDraftCampaign: saveDraftMutation.mutateAsync,
    isSavingDraft: saveDraftMutation.isPending,
    sendCampaign: sendCampaignMutation.mutateAsync,
    isSendingCampaign: sendCampaignMutation.isPending,
    deleteCampaign: deleteCampaignMutation.mutateAsync,
    isDeletingCampaign: deleteCampaignMutation.isPending,
    getCampaignRecipients,
    continueProcessing: continueProcessing.mutateAsync,
    isContinuing: continueProcessing.isPending,
  };
}
