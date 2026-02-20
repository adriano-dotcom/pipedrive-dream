import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getErrorMessage } from '@/services/supabaseErrors';
import type { MergeBackup, TransferredRelations } from './useMergeBackups';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

export function useUndoMergeContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const undoMutation = useMutation({
    mutationFn: async (backupId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Fetch backup
      const { data: backup, error: fetchError } = await supabase
        .from('merge_backups')
        .select('*')
        .eq('id', backupId)
        .eq('entity_type', 'person')
        .eq('is_restored', false)
        .single();

      if (fetchError || !backup) throw new Error('Backup não encontrado ou já restaurado');

      const typedBackup = backup as unknown as MergeBackup;
      const deletedData = typedBackup.deleted_entity_data as Person;
      const previousData = typedBackup.kept_entity_previous_data as Person;
      const relations = typedBackup.transferred_relations as TransferredRelations;

      // 2. Restore the deleted person
      const { error: insertError } = await supabase
        .from('people')
        .insert({
          id: typedBackup.deleted_entity_id,
          name: deletedData.name,
          email: deletedData.email,
          phone: deletedData.phone,
          whatsapp: deletedData.whatsapp,
          cpf: deletedData.cpf,
          job_title: deletedData.job_title,
          organization_id: deletedData.organization_id,
          label: deletedData.label,
          lead_source: deletedData.lead_source,
          utm_source: deletedData.utm_source,
          utm_medium: deletedData.utm_medium,
          utm_campaign: deletedData.utm_campaign,
          notes: deletedData.notes,
          owner_id: deletedData.owner_id,
          created_by: deletedData.created_by,
          created_at: deletedData.created_at,
        });

      if (insertError) throw insertError;

      // 3. Revert the kept person to previous state
      const { error: revertError } = await supabase
        .from('people')
        .update({
          name: previousData.name,
          email: previousData.email,
          phone: previousData.phone,
          whatsapp: previousData.whatsapp,
          cpf: previousData.cpf,
          job_title: previousData.job_title,
          organization_id: previousData.organization_id,
          label: previousData.label,
          lead_source: previousData.lead_source,
          utm_source: previousData.utm_source,
          utm_medium: previousData.utm_medium,
          utm_campaign: previousData.utm_campaign,
          notes: previousData.notes,
        })
        .eq('id', typedBackup.kept_entity_id);

      if (revertError) throw revertError;

      // 4. Revert transferred relations
      if (relations.activities?.length > 0) {
        await supabase
          .from('activities')
          .update({ person_id: typedBackup.deleted_entity_id })
          .in('id', relations.activities);
      }

      if (relations.deals?.length > 0) {
        await supabase
          .from('deals')
          .update({ person_id: typedBackup.deleted_entity_id })
          .in('id', relations.deals);
      }

      if (relations.notes?.length > 0) {
        await supabase
          .from('people_notes')
          .update({ person_id: typedBackup.deleted_entity_id })
          .in('id', relations.notes);
      }

      if (relations.files?.length > 0) {
        await supabase
          .from('people_files')
          .update({ person_id: typedBackup.deleted_entity_id })
          .in('id', relations.files);
      }

      // Revert tags - need to re-assign to deleted person
      if (relations.tags?.length > 0) {
        // Insert tag assignments for restored person
        const tagAssignments = relations.tags.map(tagId => ({
          person_id: typedBackup.deleted_entity_id,
          tag_id: tagId,
        }));
        await supabase.from('person_tag_assignments').insert(tagAssignments);
      }

      if (relations.emails?.length > 0) {
        await supabase
          .from('sent_emails')
          .update({ entity_id: typedBackup.deleted_entity_id })
          .eq('entity_type', 'person')
          .in('id', relations.emails);
      }

      // Revert organizations primary contact
      if (relations.orgs_primary_contact?.length > 0) {
        await supabase
          .from('organizations')
          .update({ primary_contact_id: typedBackup.deleted_entity_id })
          .in('id', relations.orgs_primary_contact);
      }

      // 5. Mark backup as restored
      await supabase
        .from('merge_backups')
        .update({ is_restored: true })
        .eq('id', backupId);

      // 6. Log in history
      await supabase.from('people_history').insert({
        person_id: typedBackup.kept_entity_id,
        event_type: 'merge_undone',
        description: `Mesclagem com "${deletedData.name}" desfeita`,
        metadata: { restored_person_id: typedBackup.deleted_entity_id },
        created_by: user.id,
      });

      return { restoredPersonId: typedBackup.deleted_entity_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['merge-backups'] });
      toast.success('Mesclagem desfeita com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao desfazer mesclagem:', error);
      toast.error('Erro ao desfazer mesclagem: ' + getErrorMessage(error));
    },
  });

  return {
    undoMerge: undoMutation.mutateAsync,
    isUndoing: undoMutation.isPending,
  };
}
