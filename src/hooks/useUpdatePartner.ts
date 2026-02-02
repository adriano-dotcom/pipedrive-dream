import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdatePartnerData {
  // Dados pessoais
  name?: string;
  document?: string | null;
  qualification?: string | null;
  entry_date?: string | null;
  country?: string | null;
  
  // Contato
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  job_title?: string | null;
  
  // Representante legal
  legal_rep_name?: string | null;
  legal_rep_document?: string | null;
  legal_rep_qualification?: string | null;
  
  // Observações
  notes?: string | null;
}

export function useUpdatePartner(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ partnerId, data }: { partnerId: string; data: UpdatePartnerData }) => {
      const updateData: Record<string, unknown> = {};
      
      // Dados pessoais
      if (data.name !== undefined) updateData.name = data.name;
      if (data.document !== undefined) updateData.document = data.document || null;
      if (data.qualification !== undefined) updateData.qualification = data.qualification || null;
      if (data.entry_date !== undefined) updateData.entry_date = data.entry_date || null;
      if (data.country !== undefined) updateData.country = data.country || null;
      
      // Contato
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.phone !== undefined) updateData.phone = data.phone || null;
      if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp || null;
      if (data.job_title !== undefined) updateData.job_title = data.job_title || null;
      
      // Representante legal
      if (data.legal_rep_name !== undefined) updateData.legal_rep_name = data.legal_rep_name || null;
      if (data.legal_rep_document !== undefined) updateData.legal_rep_document = data.legal_rep_document || null;
      if (data.legal_rep_qualification !== undefined) updateData.legal_rep_qualification = data.legal_rep_qualification || null;
      
      // Observações
      if (data.notes !== undefined) updateData.notes = data.notes || null;
      
      const { error } = await supabase
        .from('organization_partners')
        .update(updateData)
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
