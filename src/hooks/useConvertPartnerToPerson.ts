import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ConvertPartnerData {
  partnerId: string;
  name: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  organizationId: string;
  setAsPrimaryContact?: boolean;
}

export function useConvertPartnerToPerson(organizationId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: ConvertPartnerData) => {
      // Limpar CPF (remover caracteres não numéricos)
      const cleanCpf = data.cpf?.replace(/\D/g, '') || null;
      
      // Verificar se CPF tem 11 dígitos (é CPF válido)
      const isValidCpf = cleanCpf && cleanCpf.length === 11;

      // Criar pessoa
      const { data: newPerson, error: insertError } = await supabase
        .from('people')
        .insert({
          name: data.name,
          cpf: isValidCpf ? cleanCpf : null,
          email: data.email || null,
          phone: data.phone || null,
          job_title: data.job_title || null,
          organization_id: data.organizationId,
          partner_id: data.partnerId,
          created_by: user?.id,
          owner_id: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Se marcou como contato principal, atualizar organização
      if (data.setAsPrimaryContact && newPerson) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ primary_contact_id: newPerson.id })
          .eq('id', data.organizationId);

        if (updateError) {
          console.error('Error setting primary contact:', updateError);
        }
      }

      return newPerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-partners', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-people', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      toast.success('Pessoa criada com sucesso');
    },
    onError: (error: Error) => {
      console.error('Error converting partner to person:', error);
      
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('Já existe uma pessoa com esse CPF ou email');
      } else {
        toast.error('Erro ao criar pessoa');
      }
    },
  });
}
