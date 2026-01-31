import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface MergeContactsParams {
  keepPersonId: string;
  deletePersonId: string;
  deletePersonName: string;
  mergedData: Partial<Person>;
}

export function useMergeContacts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mergeMutation = useMutation({
    mutationFn: async ({ keepPersonId, deletePersonId, deletePersonName, mergedData }: MergeContactsParams) => {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Atualizar o registro mantido com os dados mesclados
      const { error: updateError } = await supabase
        .from('people')
        .update(mergedData)
        .eq('id', keepPersonId);

      if (updateError) throw updateError;

      // 2. Transferir atividades
      const { error: activitiesError } = await supabase
        .from('activities')
        .update({ person_id: keepPersonId })
        .eq('person_id', deletePersonId);

      if (activitiesError) throw activitiesError;

      // 3. Transferir negócios
      const { error: dealsError } = await supabase
        .from('deals')
        .update({ person_id: keepPersonId })
        .eq('person_id', deletePersonId);

      if (dealsError) throw dealsError;

      // 4. Transferir notas
      const { error: notesError } = await supabase
        .from('people_notes')
        .update({ person_id: keepPersonId })
        .eq('person_id', deletePersonId);

      if (notesError) throw notesError;

      // 5. Transferir arquivos
      const { error: filesError } = await supabase
        .from('people_files')
        .update({ person_id: keepPersonId })
        .eq('person_id', deletePersonId);

      if (filesError) throw filesError;

      // 6. Transferir histórico
      const { error: historyError } = await supabase
        .from('people_history')
        .update({ person_id: keepPersonId })
        .eq('person_id', deletePersonId);

      if (historyError) throw historyError;

      // 7. Combinar tags (remover duplicatas)
      const { data: existingTags } = await supabase
        .from('person_tag_assignments')
        .select('tag_id')
        .eq('person_id', keepPersonId);

      const { data: otherTags } = await supabase
        .from('person_tag_assignments')
        .select('tag_id')
        .eq('person_id', deletePersonId);

      const existingTagIds = new Set(existingTags?.map(t => t.tag_id) || []);
      const newTags = (otherTags || []).filter(t => !existingTagIds.has(t.tag_id));

      if (newTags.length > 0) {
        const { error: insertTagsError } = await supabase
          .from('person_tag_assignments')
          .insert(newTags.map(t => ({ person_id: keepPersonId, tag_id: t.tag_id })));

        if (insertTagsError) throw insertTagsError;
      }

      // Remover assignments do contato excluído
      const { error: deleteTagsError } = await supabase
        .from('person_tag_assignments')
        .delete()
        .eq('person_id', deletePersonId);

      if (deleteTagsError) throw deleteTagsError;

      // 8. Transferir emails enviados
      const { error: emailsError } = await supabase
        .from('sent_emails')
        .update({ entity_id: keepPersonId })
        .eq('entity_type', 'person')
        .eq('entity_id', deletePersonId);

      if (emailsError) throw emailsError;

      // 9. Atualizar primary_contact_id nas organizações
      const { error: orgsError } = await supabase
        .from('organizations')
        .update({ primary_contact_id: keepPersonId })
        .eq('primary_contact_id', deletePersonId);

      if (orgsError) throw orgsError;

      // 10. Registrar evento no histórico
      const { error: historyInsertError } = await supabase
        .from('people_history')
        .insert({
          person_id: keepPersonId,
          event_type: 'contacts_merged',
          description: `Contato mesclado com "${deletePersonName}"`,
          metadata: { deleted_person_id: deletePersonId, deleted_person_name: deletePersonName },
          created_by: user.id,
        });

      if (historyInsertError) throw historyInsertError;

      // 11. Excluir o contato duplicado
      const { error: deleteError } = await supabase
        .from('people')
        .delete()
        .eq('id', deletePersonId);

      if (deleteError) throw deleteError;

      return { keepPersonId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Contatos mesclados com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao mesclar contatos:', error);
      toast.error('Erro ao mesclar contatos: ' + error.message);
    },
  });

  return {
    mergeContacts: mergeMutation.mutateAsync,
    isMerging: mergeMutation.isPending,
  };
}
