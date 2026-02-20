import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getErrorMessage } from '@/services/supabaseErrors';
import type { MergeBackup, TransferredRelations } from './useMergeBackups';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

export function useUndoMergeOrganization() {
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
        .eq('entity_type', 'organization')
        .eq('is_restored', false)
        .single();

      if (fetchError || !backup) throw new Error('Backup não encontrado ou já restaurado');

      const typedBackup = backup as unknown as MergeBackup;
      const deletedData = typedBackup.deleted_entity_data as Organization;
      const previousData = typedBackup.kept_entity_previous_data as Organization;
      const relations = typedBackup.transferred_relations as TransferredRelations;

      // 2. Restore the deleted organization
      const { error: insertError } = await supabase
        .from('organizations')
        .insert({
          id: typedBackup.deleted_entity_id,
          name: deletedData.name,
          cnpj: deletedData.cnpj,
          cnae: deletedData.cnae,
          rntrc_antt: deletedData.rntrc_antt,
          phone: deletedData.phone,
          email: deletedData.email,
          website: deletedData.website,
          address_street: deletedData.address_street,
          address_number: deletedData.address_number,
          address_complement: deletedData.address_complement,
          address_neighborhood: deletedData.address_neighborhood,
          address_city: deletedData.address_city,
          address_state: deletedData.address_state,
          address_zipcode: deletedData.address_zipcode,
          label: deletedData.label,
          notes: deletedData.notes,
          broker_notes: deletedData.broker_notes,
          primary_contact_id: deletedData.primary_contact_id,
          insurance_branches: deletedData.insurance_branches,
          preferred_insurers: deletedData.preferred_insurers,
          fleet_type: deletedData.fleet_type,
          fleet_size: deletedData.fleet_size,
          current_insurer: deletedData.current_insurer,
          risk_profile: deletedData.risk_profile,
          policy_renewal_month: deletedData.policy_renewal_month,
          annual_premium_estimate: deletedData.annual_premium_estimate,
          has_claims_history: deletedData.has_claims_history,
          automotores: deletedData.automotores,
          owner_id: deletedData.owner_id,
          created_by: deletedData.created_by,
          created_at: deletedData.created_at,
        });

      if (insertError) throw insertError;

      // 3. Revert the kept organization to previous state
      const { error: revertError } = await supabase
        .from('organizations')
        .update({
          name: previousData.name,
          cnpj: previousData.cnpj,
          cnae: previousData.cnae,
          rntrc_antt: previousData.rntrc_antt,
          phone: previousData.phone,
          email: previousData.email,
          website: previousData.website,
          address_street: previousData.address_street,
          address_number: previousData.address_number,
          address_complement: previousData.address_complement,
          address_neighborhood: previousData.address_neighborhood,
          address_city: previousData.address_city,
          address_state: previousData.address_state,
          address_zipcode: previousData.address_zipcode,
          label: previousData.label,
          notes: previousData.notes,
          broker_notes: previousData.broker_notes,
          primary_contact_id: previousData.primary_contact_id,
          insurance_branches: previousData.insurance_branches,
          preferred_insurers: previousData.preferred_insurers,
          fleet_type: previousData.fleet_type,
          fleet_size: previousData.fleet_size,
          current_insurer: previousData.current_insurer,
          risk_profile: previousData.risk_profile,
          policy_renewal_month: previousData.policy_renewal_month,
          annual_premium_estimate: previousData.annual_premium_estimate,
          has_claims_history: previousData.has_claims_history,
          automotores: previousData.automotores,
        })
        .eq('id', typedBackup.kept_entity_id);

      if (revertError) throw revertError;

      // 4. Revert transferred relations
      if (relations.activities?.length > 0) {
        await supabase
          .from('activities')
          .update({ organization_id: typedBackup.deleted_entity_id })
          .in('id', relations.activities);
      }

      if (relations.deals?.length > 0) {
        await supabase
          .from('deals')
          .update({ organization_id: typedBackup.deleted_entity_id })
          .in('id', relations.deals);
      }

      // Revert people back to deleted organization
      if (relations.people?.length > 0) {
        await supabase
          .from('people')
          .update({ organization_id: typedBackup.deleted_entity_id })
          .in('id', relations.people);
      }

      if (relations.notes?.length > 0) {
        await supabase
          .from('organization_notes')
          .update({ organization_id: typedBackup.deleted_entity_id })
          .in('id', relations.notes);
      }

      if (relations.files?.length > 0) {
        await supabase
          .from('organization_files')
          .update({ organization_id: typedBackup.deleted_entity_id })
          .in('id', relations.files);
      }

      // Revert tags - need to re-assign to deleted org
      if (relations.tags?.length > 0) {
        const tagAssignments = relations.tags.map(tagId => ({
          organization_id: typedBackup.deleted_entity_id,
          tag_id: tagId,
        }));
        await supabase.from('organization_tag_assignments').insert(tagAssignments);
      }

      if (relations.emails?.length > 0) {
        await supabase
          .from('sent_emails')
          .update({ entity_id: typedBackup.deleted_entity_id })
          .eq('entity_type', 'organization')
          .in('id', relations.emails);
      }

      // 5. Mark backup as restored
      await supabase
        .from('merge_backups')
        .update({ is_restored: true })
        .eq('id', backupId);

      // 6. Log in history
      await supabase.from('organization_history').insert({
        organization_id: typedBackup.kept_entity_id,
        event_type: 'merge_undone',
        description: `Mesclagem com "${deletedData.name}" desfeita`,
        metadata: { restored_organization_id: typedBackup.deleted_entity_id },
        created_by: user.id,
      });

      return { restoredOrganizationId: typedBackup.deleted_entity_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
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
