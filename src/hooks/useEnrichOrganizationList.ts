import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/services/supabaseErrors';

interface EnrichResult {
  success: boolean;
  message: string;
  updated_fields: number;
  partners_synced: number;
}

interface EnrichParams {
  organizationId: string;
  cnpj: string;
}

export function useEnrichOrganizationList() {
  const queryClient = useQueryClient();
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ organizationId, cnpj }: EnrichParams): Promise<EnrichResult> => {
      setEnrichingId(organizationId);
      
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
      queryClient.invalidateQueries({ queryKey: ['organizations'] });

      toast.success('Dados atualizados com sucesso!', {
        description: `${data.updated_fields} campos atualizados, ${data.partners_synced} sócios sincronizados.`,
      });
    },
    onError: (error: Error) => {
      console.error('[useEnrichOrganizationList] Error:', error);
      toast.error('Erro ao atualizar dados', {
        description: getErrorMessage(error),
      });
    },
    onSettled: () => {
      setEnrichingId(null);
    },
  });

  return {
    enrich: mutation.mutate,
    enrichAsync: mutation.mutateAsync,
    isEnriching: mutation.isPending,
    enrichingId,
    error: mutation.error,
  };
}
