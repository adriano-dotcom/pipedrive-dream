import { useState } from 'react';
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
import { Plus, Search, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { OrganizationForm } from '@/components/organizations/OrganizationForm';
import { OrganizationsTable } from '@/components/organizations/OrganizationsTable';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

type OrganizationWithContact = Organization & {
  primary_contact: {
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

export default function Organizations() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationWithContact | null>(null);

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations', search],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select(`
          *,
          primary_contact:people!primary_contact_id(
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
      return data as OrganizationWithContact[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Organização excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir organização: ' + error.message);
    },
  });

  const handleEdit = (org: OrganizationWithContact) => {
    setEditingOrg(org);
    setIsDialogOpen(true);
  };

  const handleDelete = (org: OrganizationWithContact) => {
    if (confirm(`Tem certeza que deseja excluir "${org.name}"?`)) {
      deleteMutation.mutate(org.id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingOrg(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Organizações
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie empresas e clientes da sua corretora
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingOrg(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Organização
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CNPJ ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : organizations?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma organização encontrada</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'Tente ajustar sua busca' : 'Adicione sua primeira organização para começar'}
          </p>
        </div>
      ) : (
        <OrganizationsTable
          organizations={organizations || []}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
