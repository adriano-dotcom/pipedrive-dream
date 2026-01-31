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
import { Plus, Search, Building2, Loader2, Sparkles } from 'lucide-react';
import { ImportButton } from '@/components/import/ImportButton';
import { toast } from 'sonner';
import { OrganizationForm } from '@/components/organizations/OrganizationForm';
import { OrganizationsTable } from '@/components/organizations/OrganizationsTable';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { TagFilterPopover } from '@/components/shared/TagFilterPopover';
import { useOrganizationTags } from '@/hooks/useOrganizationTags';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

type LinkedPerson = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type OrganizationWithContact = Organization & {
  primary_contact: {
    id?: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  linked_people?: LinkedPerson[];
  is_fallback_contact?: boolean;
  fallback_contact_id?: string;
};

export default function Organizations() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationWithContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationWithContact | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('org-tag-filter');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist tag filter to localStorage
  useEffect(() => {
    localStorage.setItem('org-tag-filter', JSON.stringify(selectedTagIds));
  }, [selectedTagIds]);

  // Fetch all organization tags
  const { data: organizationTags = [], isLoading: tagsLoading } = useOrganizationTags();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations', search],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select(`
          *,
          primary_contact:people!primary_contact_id(
            id,
            name,
            phone,
            email
          ),
          linked_people:people!people_organization_id_fkey(
            id,
            name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,cnpj.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Process data to apply fallback contact logic
      const processedData = (data || []).map(org => {
        const hasPrimaryContact = !!org.primary_contact;
        const hasLinkedPeople = org.linked_people && org.linked_people.length > 0;
        
        return {
          ...org,
          primary_contact: org.primary_contact || 
            (hasLinkedPeople ? {
              id: org.linked_people![0].id,
              name: org.linked_people![0].name,
              phone: org.linked_people![0].phone,
              email: org.linked_people![0].email,
            } : null),
          is_fallback_contact: !hasPrimaryContact && hasLinkedPeople,
          fallback_contact_id: !hasPrimaryContact && hasLinkedPeople ? org.linked_people![0].id : undefined,
        };
      });
      
      return processedData as OrganizationWithContact[];
    },
  });

  // Fetch tag assignments for filtering
  const { data: tagAssignments = [] } = useQuery({
    queryKey: ['org-tag-filter-assignments', selectedTagIds],
    queryFn: async () => {
      if (selectedTagIds.length === 0) return [];
      const { data, error } = await supabase
        .from('organization_tag_assignments')
        .select('organization_id')
        .in('tag_id', selectedTagIds);
      if (error) throw error;
      return data?.map((a) => a.organization_id) || [];
    },
    enabled: selectedTagIds.length > 0,
  });

  // Filter organizations based on tags
  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    if (selectedTagIds.length === 0) return organizations;
    const validIds = new Set(tagAssignments);
    return organizations.filter((o) => validIds.has(o.id));
  }, [organizations, selectedTagIds, tagAssignments]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Organização excluída com sucesso!');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir organização: ' + error.message);
    },
  });

  const setPrimaryContactMutation = useMutation({
    mutationFn: async ({ orgId, contactId }: { orgId: string; contactId: string }) => {
      const { error } = await supabase
        .from('organizations')
        .update({ primary_contact_id: contactId })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Contato principal definido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao definir contato principal: ' + error.message);
    },
  });

  const handleSetPrimaryContact = (orgId: string, contactId: string) => {
    setPrimaryContactMutation.mutate({ orgId, contactId });
  };

  const handleEdit = (org: OrganizationWithContact) => {
    setEditingOrg(org);
    setIsDialogOpen(true);
  };

  const handleDelete = (org: OrganizationWithContact) => {
    setDeleteTarget(org);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingOrg(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Organizações</h1>
              <p className="text-muted-foreground text-sm">
                Gerencie empresas e clientes da sua corretora
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ImportButton defaultType="organizations" />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingOrg(null)} className="shadow-lg shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Organização
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass border-border/50">
              <DialogHeader>
                <DialogTitle>
                  {editingOrg ? 'Editar Organização' : 'Nova Organização'}
                </DialogTitle>
              </DialogHeader>
              <OrganizationForm
                organization={editingOrg}
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
              placeholder="Buscar por nome, CNPJ ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/50"
            />
          </div>
          <TagFilterPopover
            tags={organizationTags}
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
            <p className="text-sm text-muted-foreground mt-4">Carregando organizações...</p>
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-2xl bg-muted/50 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
                <Building2 className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhuma organização encontrada</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {search || selectedTagIds.length > 0 ? 'Tente ajustar sua busca ou filtros' : 'Adicione sua primeira organização para começar a gerenciar seus clientes'}
            </p>
            {!search && selectedTagIds.length === 0 && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Criar Primeira Organização
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/30">
            <OrganizationsTable
              organizations={filteredOrganizations}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetPrimaryContact={handleSetPrimaryContact}
              isSettingPrimaryContact={setPrimaryContactMutation.isPending}
            />
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Excluir Organização"
          itemName={deleteTarget?.name}
          onConfirm={confirmDelete}
          isDeleting={deleteMutation.isPending}
        />
    </div>
  );
}
