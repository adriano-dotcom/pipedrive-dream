import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ContactPersonItem } from './ContactPersonItem';
import { AddContactPersonDialog } from './AddContactPersonDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface ContactPersonSectionProps {
  organizationId?: string;
  primaryContactId?: string | null;
  onPrimaryContactChange: (personId: string | null) => void;
  // For creation mode - local state of new contacts
  pendingContacts?: Person[];
  onPendingContactsChange?: (contacts: Person[]) => void;
}

export function ContactPersonSection({
  organizationId,
  primaryContactId,
  onPrimaryContactChange,
  pendingContacts = [],
  onPendingContactsChange,
}: ContactPersonSectionProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);

  // Fetch linked contacts for existing organization
  const { data: linkedContacts, isLoading } = useQuery({
    queryKey: ['organization-contacts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      
      if (error) throw error;
      return data as Person[];
    },
    enabled: !!organizationId,
  });

  // Unlink person mutation
  const unlinkMutation = useMutation({
    mutationFn: async (personId: string) => {
      const { error } = await supabase
        .from('people')
        .update({ organization_id: null })
        .eq('id', personId);
      
      if (error) throw error;
    },
    onSuccess: (_, personId) => {
      queryClient.invalidateQueries({ queryKey: ['organization-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      
      // If unlinking primary contact, clear it
      if (personId === primaryContactId) {
        onPrimaryContactChange(null);
      }
      
      toast.success('Pessoa desvinculada da organização');
    },
    onError: (error) => {
      toast.error('Erro ao desvincular: ' + error.message);
    },
  });

  // Delete person mutation
  const deleteMutation = useMutation({
    mutationFn: async (personId: string) => {
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', personId);
      
      if (error) throw error;
    },
    onSuccess: (_, personId) => {
      queryClient.invalidateQueries({ queryKey: ['organization-contacts', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      
      // If deleting primary contact, clear it
      if (personId === primaryContactId) {
        onPrimaryContactChange(null);
      }
      
      toast.success('Pessoa excluída permanentemente');
      setDeletingPerson(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir pessoa: ' + error.message);
    },
  });

  const handleSetPrimary = (personId: string) => {
    if (personId === primaryContactId) {
      onPrimaryContactChange(null);
    } else {
      onPrimaryContactChange(personId);
    }
  };

  const handleUnlink = (personId: string) => {
    if (organizationId) {
      // Edit mode - update database
      unlinkMutation.mutate(personId);
    } else {
      // Create mode - remove from pending
      onPendingContactsChange?.(pendingContacts.filter(p => p.id !== personId));
      if (personId === primaryContactId) {
        onPrimaryContactChange(null);
      }
    }
  };

  const handleDelete = (person: Person) => {
    setDeletingPerson(person);
  };

  const confirmDelete = () => {
    if (deletingPerson) {
      deleteMutation.mutate(deletingPerson.id);
    }
  };

  const handlePersonLinked = (person: Person) => {
    // Refresh happens via query invalidation
  };

  const handlePersonCreated = (person: Person) => {
    if (!organizationId) {
      // Create mode - add to pending list
      onPendingContactsChange?.([...pendingContacts, person]);
    }
    // Edit mode - refresh happens via query invalidation
  };

  // Combine linked and pending contacts
  const allContacts = organizationId ? (linkedContacts || []) : pendingContacts;
  const excludePersonIds = allContacts.map(p => p.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Users className="h-4 w-4" />
          Pessoas de Contato
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : allContacts.length === 0 ? (
        <div className="text-center py-6 border rounded-lg border-dashed">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma pessoa de contato vinculada
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="mt-1"
          >
            Adicionar pessoa de contato
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {allContacts.map((person) => (
            <ContactPersonItem
              key={person.id}
              person={person}
              isPrimary={person.id === primaryContactId}
              onSetPrimary={handleSetPrimary}
              onUnlink={handleUnlink}
              onDelete={organizationId ? handleDelete : undefined}
            />
          ))}
        </div>
      )}

      <AddContactPersonDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        organizationId={organizationId}
        excludePersonIds={excludePersonIds}
        onPersonLinked={handlePersonLinked}
        onPersonCreated={handlePersonCreated}
      />

      <DeleteConfirmDialog
        open={!!deletingPerson}
        onOpenChange={(open) => !open && setDeletingPerson(null)}
        title="Excluir pessoa?"
        description={`Tem certeza que deseja excluir "${deletingPerson?.name}" permanentemente? Esta ação não pode ser desfeita. Todos os dados da pessoa, incluindo atividades, notas e arquivos vinculados, serão removidos.`}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
