import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

interface MergeOrganizationsParams {
  keepOrgId: string;
  deleteOrgId: string;
  deleteOrgName: string;
  mergedData: Partial<Organization>;
}

export function useMergeOrganizations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mergeMutation = useMutation({
    mutationFn: async ({ keepOrgId, deleteOrgId, deleteOrgName, mergedData }: MergeOrganizationsParams) => {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Atualizar o registro mantido com os dados mesclados
      const { error: updateError } = await supabase
        .from('organizations')
        .update(mergedData)
        .eq('id', keepOrgId);

      if (updateError) throw updateError;

      // 2. Transferir atividades
      const { error: activitiesError } = await supabase
        .from('activities')
        .update({ organization_id: keepOrgId })
        .eq('organization_id', deleteOrgId);

      if (activitiesError) throw activitiesError;

      // 3. Transferir negócios
      const { error: dealsError } = await supabase
        .from('deals')
        .update({ organization_id: keepOrgId })
        .eq('organization_id', deleteOrgId);

      if (dealsError) throw dealsError;

      // 4. Transferir pessoas vinculadas
      const { error: peopleError } = await supabase
        .from('people')
        .update({ organization_id: keepOrgId })
        .eq('organization_id', deleteOrgId);

      if (peopleError) throw peopleError;

      // 5. Transferir notas
      const { error: notesError } = await supabase
        .from('organization_notes')
        .update({ organization_id: keepOrgId })
        .eq('organization_id', deleteOrgId);

      if (notesError) throw notesError;

      // 6. Transferir arquivos
      const { error: filesError } = await supabase
        .from('organization_files')
        .update({ organization_id: keepOrgId })
        .eq('organization_id', deleteOrgId);

      if (filesError) throw filesError;

      // 7. Transferir histórico
      const { error: historyError } = await supabase
        .from('organization_history')
        .update({ organization_id: keepOrgId })
        .eq('organization_id', deleteOrgId);

      if (historyError) throw historyError;

      // 8. Combinar tags (remover duplicatas)
      const { data: existingTags } = await supabase
        .from('organization_tag_assignments')
        .select('tag_id')
        .eq('organization_id', keepOrgId);

      const { data: otherTags } = await supabase
        .from('organization_tag_assignments')
        .select('tag_id')
        .eq('organization_id', deleteOrgId);

      const existingTagIds = new Set(existingTags?.map(t => t.tag_id) || []);
      const newTags = (otherTags || []).filter(t => !existingTagIds.has(t.tag_id));

      if (newTags.length > 0) {
        const { error: insertTagsError } = await supabase
          .from('organization_tag_assignments')
          .insert(newTags.map(t => ({ organization_id: keepOrgId, tag_id: t.tag_id })));

        if (insertTagsError) throw insertTagsError;
      }

      // Remover assignments da organização excluída
      const { error: deleteTagsError } = await supabase
        .from('organization_tag_assignments')
        .delete()
        .eq('organization_id', deleteOrgId);

      if (deleteTagsError) throw deleteTagsError;

      // 9. Transferir emails enviados
      const { error: emailsError } = await supabase
        .from('sent_emails')
        .update({ entity_id: keepOrgId })
        .eq('entity_type', 'organization')
        .eq('entity_id', deleteOrgId);

      if (emailsError) throw emailsError;

      // 10. Registrar evento no histórico
      const { error: historyInsertError } = await supabase
        .from('organization_history')
        .insert({
          organization_id: keepOrgId,
          event_type: 'organizations_merged',
          description: `Organização mesclada com "${deleteOrgName}"`,
          metadata: { deleted_organization_id: deleteOrgId, deleted_organization_name: deleteOrgName },
          created_by: user.id,
        });

      if (historyInsertError) throw historyInsertError;

      // 11. Excluir a organização duplicada
      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', deleteOrgId);

      if (deleteError) throw deleteError;

      return { keepOrgId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Organizações mescladas com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao mesclar organizações:', error);
      toast.error('Erro ao mesclar organizações: ' + error.message);
    },
  });

  return {
    mergeOrganizations: mergeMutation.mutateAsync,
    isMerging: mergeMutation.isPending,
  };
}
