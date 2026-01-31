import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, Users, Loader2, Sparkles } from 'lucide-react';
import { ImportButton } from '@/components/import/ImportButton';
import { toast } from 'sonner';
import { PersonForm } from '@/components/people/PersonForm';
import { PeopleTable } from '@/components/people/PeopleTable';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { TagFilterPopover } from '@/components/shared/TagFilterPopover';
import { usePersonTags } from '@/hooks/usePersonTags';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface PersonWithOrg extends Person {
  organizations?: {
    id: string;
    name: string;
    cnpj: string | null;
    address_city: string | null;
    address_state: string | null;
    automotores: number | null;
  } | null;
}

export default function People() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonWithOrg | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonWithOrg | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('people-tag-filter');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist tag filter to localStorage
  useEffect(() => {
    localStorage.setItem('people-tag-filter', JSON.stringify(selectedTagIds));
  }, [selectedTagIds]);

  // Fetch all person tags
  const { data: personTags = [], isLoading: tagsLoading } = usePersonTags();

  const { data: people, isLoading } = useQuery({
    queryKey: ['people', search],
    queryFn: async () => {
      let query = supabase
        .from('people')
        .select('*, organizations:organizations!people_organization_id_fkey(id, name, cnpj, address_city, address_state, automotores)')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PersonWithOrg[];
    },
  });

  // Fetch tag assignments for filtering
  const { data: tagAssignments = [] } = useQuery({
    queryKey: ['person-tag-filter-assignments', selectedTagIds],
    queryFn: async () => {
      if (selectedTagIds.length === 0) return [];
      const { data, error } = await supabase
        .from('person_tag_assignments')
        .select('person_id')
        .in('tag_id', selectedTagIds);
      if (error) throw error;
      return data?.map((a) => a.person_id) || [];
    },
    enabled: selectedTagIds.length > 0,
  });

  // Filter people based on tags
  const filteredPeople = useMemo(() => {
    if (!people) return [];
    if (selectedTagIds.length === 0) return people;
    const validIds = new Set(tagAssignments);
    return people.filter((p) => validIds.has(p.id));
  }, [people, selectedTagIds, tagAssignments]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('people').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Pessoa excluída com sucesso!');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir pessoa: ' + error.message);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('people').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(`${selectedIds.length} pessoa(s) excluída(s) com sucesso!`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    },
    onError: (error) => {
      toast.error('Erro ao excluir pessoas: ' + error.message);
    },
  });

  const handleEdit = (person: PersonWithOrg) => {
    setEditingPerson(person);
    setIsDialogOpen(true);
  };

  const handleDelete = (person: PersonWithOrg) => {
    setDeleteTarget(person);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPerson(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie contatos individuais e leads
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton defaultType="people" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPerson(null)} className="shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" />
                Nova Pessoa
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass border-border/50">
            <DialogHeader>
              <DialogTitle>
                {editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'}
              </DialogTitle>
            </DialogHeader>
            <PersonForm
              person={editingPerson}
              onSuccess={handleCloseDialog}
              onCancel={handleCloseDialog}
            />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Tag Filter */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/50"
          />
        </div>
        <TagFilterPopover
          tags={personTags}
          isLoading={tagsLoading}
          selectedTagIds={selectedTagIds}
          onTagsChange={setSelectedTagIds}
          placeholder="Etiquetas"
          emptyMessage="Nenhuma etiqueta criada"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Loader2 className="h-8 w-8 animate-spin text-primary relative" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">Carregando pessoas...</p>
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-2xl bg-muted/50 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-1">Nenhuma pessoa encontrada</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {search || selectedTagIds.length > 0 ? 'Tente ajustar sua busca ou filtros' : 'Adicione seu primeiro contato para começar'}
          </p>
          {!search && selectedTagIds.length === 0 && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Criar Primeiro Contato
            </Button>
          )}
        </div>
      ) : (
        <PeopleTable
          people={filteredPeople}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={() => setBulkDeleteOpen(true)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Pessoa"
        itemName={deleteTarget?.name}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Excluir Pessoas"
        itemCount={selectedIds.length}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        isDeleting={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
