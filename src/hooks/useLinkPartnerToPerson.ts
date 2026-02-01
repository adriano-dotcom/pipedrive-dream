import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LinkPartnerToPersonParams {
  personId: string;
  partnerId: string;
  partnerName: string;
  partnerDocument: string | null;
  updateName: boolean;
  updateCpf: boolean;
}

export function useLinkPartnerToPerson(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      personId,
      partnerId,
      partnerName,
      partnerDocument,
      updateName,
      updateCpf,
    }: LinkPartnerToPersonParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Build update object
      const updateData: Record<string, unknown> = {
        partner_id: partnerId,
      };

      if (updateName) {
        updateData.name = partnerName;
      }

      if (updateCpf && partnerDocument) {
        // Only update CPF if document looks like CPF (11 digits)
        const cleanDoc = partnerDocument.replace(/\D/g, '');
        if (cleanDoc.length === 11) {
          updateData.cpf = cleanDoc;
        }
      }

      // Update person with partner link
      const { error: updateError } = await supabase
        .from('people')
        .update(updateData)
        .eq('id', personId);

      if (updateError) throw updateError;

      // Register in person history
      const { error: historyError } = await supabase
        .from('people_history')
        .insert({
          person_id: personId,
          event_type: 'partner_linked',
          description: `Vinculado ao sócio "${partnerName}" do Quadro Societário`,
          created_by: user.id,
          metadata: {
            partner_id: partnerId,
            partner_name: partnerName,
            updated_name: updateName,
            updated_cpf: updateCpf && partnerDocument ? true : false,
          },
        });

      if (historyError) {
        console.error('Error logging history:', historyError);
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Pessoa vinculada ao sócio com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['organization-partners', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-people', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
    onError: (error) => {
      console.error('Error linking partner to person:', error);
      toast.error('Erro ao vincular pessoa ao sócio');
    },
  });
}

export function useUnlinkPartnerFromPerson(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get current person data for history
      const { data: person } = await supabase
        .from('people')
        .select('partner_id')
        .eq('id', personId)
        .single();

      // Remove partner link
      const { error: updateError } = await supabase
        .from('people')
        .update({ partner_id: null })
        .eq('id', personId);

      if (updateError) throw updateError;

      // Register in person history
      const { error: historyError } = await supabase
        .from('people_history')
        .insert({
          person_id: personId,
          event_type: 'partner_unlinked',
          description: 'Vínculo com sócio do Quadro Societário removido',
          created_by: user.id,
          metadata: {
            previous_partner_id: person?.partner_id,
          },
        });

      if (historyError) {
        console.error('Error logging history:', historyError);
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Vínculo removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['organization-partners', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-people', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
    onError: (error) => {
      console.error('Error unlinking partner from person:', error);
      toast.error('Erro ao remover vínculo');
    },
  });
}
