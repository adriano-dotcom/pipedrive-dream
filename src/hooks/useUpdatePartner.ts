import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdatePartnerData {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  job_title?: string | null;
}

export function useUpdatePartner(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ partnerId, data }: { partnerId: string; data: UpdatePartnerData }) => {
      const { error } = await supabase
        .from('organization_partners')
        .update({
          email: data.email || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          job_title: data.job_title || null,
        })
        .eq('id', partnerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-partners', organizationId] });
      toast.success('Dados do sócio atualizados');
    },
    onError: (error) => {
      console.error('Error updating partner:', error);
      toast.error('Erro ao atualizar dados do sócio');
    },
  });
}
