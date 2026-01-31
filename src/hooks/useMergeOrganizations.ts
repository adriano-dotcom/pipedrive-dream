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

interface MergeResult {
  keepOrgId: string;
  backupId?: string;
}

export function useMergeOrganizations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mergeMutation = useMutation({
    mutationFn: async ({ keepOrgId, deleteOrgId, deleteOrgName, mergedData }: MergeOrganizationsParams): Promise<MergeResult> => {
      if (!user) throw new Error('Usuário não autenticado');

      // ========== BACKUP BEFORE MERGE ==========

      // 1. Fetch complete data of organization being deleted
      const { data: deletedOrgData, error: fetchDeletedError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', deleteOrgId)
        .single();

      if (fetchDeletedError) throw fetchDeletedError;

      // 2. Fetch current data of organization being kept (before changes)
      const { data: keptOrgPreviousData, error: fetchKeptError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', keepOrgId)
        .single();

      if (fetchKeptError) throw fetchKeptError;

      // 3. Fetch IDs of relations that will be transferred
      const { data: activitiesToTransfer } = await supabase
        .from('activities')
        .select('id')
        .eq('organization_id', deleteOrgId);

      const { data: dealsToTransfer } = await supabase
        .from('deals')
        .select('id')
        .eq('organization_id', deleteOrgId);

      const { data: peopleToTransfer } = await supabase
        .from('people')
        .select('id')
        .eq('organization_id', deleteOrgId);

      const { data: notesToTransfer } = await supabase
        .from('organization_notes')
        .select('id')
        .eq('organization_id', deleteOrgId);

      const { data: filesToTransfer } = await supabase
        .from('organization_files')
        .select('id')
        .eq('organization_id', deleteOrgId);

      const { data: tagsToTransfer } = await supabase
        .from('organization_tag_assignments')
        .select('tag_id')
        .eq('organization_id', deleteOrgId);

      const { data: emailsToTransfer } = await supabase
        .from('sent_emails')
        .select('id')
        .eq('entity_type', 'organization')
        .eq('entity_id', deleteOrgId);

      // 4. Save backup
      const { data: backupData, error: backupError } = await supabase
        .from('merge_backups')
        .insert({
          entity_type: 'organization',
          kept_entity_id: keepOrgId,
          deleted_entity_id: deleteOrgId,
          deleted_entity_data: deletedOrgData,
          kept_entity_previous_data: keptOrgPreviousData,
          transferred_relations: {
            activities: activitiesToTransfer?.map(a => a.id) || [],
            deals: dealsToTransfer?.map(d => d.id) || [],
            people: peopleToTransfer?.map(p => p.id) || [],
            notes: notesToTransfer?.map(n => n.id) || [],
            files: filesToTransfer?.map(f => f.id) || [],
            tags: tagsToTransfer?.map(t => t.tag_id) || [],
            emails: emailsToTransfer?.map(e => e.id) || [],
          },
          merged_by: user.id,
        })
        .select('id')
        .single();

      if (backupError) throw backupError;

      // ========== PROCEED WITH MERGE ==========

      // 5. Update the kept record with merged data
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

      return { keepOrgId, backupId: backupData?.id };
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
