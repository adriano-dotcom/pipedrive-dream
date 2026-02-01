import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnrichResult {
  success: boolean;
  message: string;
  updated_fields: number;
  partners_synced: number;
}

export function useEnrichOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (cnpj?: string): Promise<EnrichResult> => {
      const { data, error } = await supabase.functions.invoke('enrich-organization', {
        body: { organizationId, cnpj },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao enriquecer dados');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as EnrichResult;
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-partners', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-history', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });

      toast.success('Dados atualizados com sucesso!', {
        description: `${data.updated_fields} campos atualizados, ${data.partners_synced} sócios sincronizados.`,
      });
    },
    onError: (error: Error) => {
      console.error('[useEnrichOrganization] Error:', error);
      toast.error('Erro ao atualizar dados', {
        description: error.message,
      });
    },
  });

  return {
    enrich: mutation.mutate,
    enrichAsync: mutation.mutateAsync,
    isEnriching: mutation.isPending,
    error: mutation.error,
  };
}
