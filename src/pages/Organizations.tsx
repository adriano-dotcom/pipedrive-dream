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
import { Plus, Search, Building2, Loader2, Sparkles } from 'lucide-react';
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/50"
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
        ) : organizations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-2xl bg-muted/50 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
                <Building2 className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhuma organização encontrada</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {search ? 'Tente ajustar sua busca' : 'Adicione sua primeira organização para começar a gerenciar seus clientes'}
            </p>
            {!search && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Criar Primeira Organização
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/30">
            <OrganizationsTable
              organizations={organizations || []}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        )}
    </div>
  );
}
