import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, Users, Phone, Mail, Building2, Loader2, Pencil, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PersonForm } from '@/components/people/PersonForm';
import { AppLayout } from '@/components/layout/AppLayout';
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('people').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Pessoa excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir pessoa: ' + error.message);
    },
  });

  const handleEdit = (person: PersonWithOrg) => {
    setEditingPerson(person);
    setIsDialogOpen(true);
  };

  const handleDelete = (person: PersonWithOrg) => {
    if (confirm(`Tem certeza que deseja excluir "${person.name}"?`)) {
      deleteMutation.mutate(person.id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPerson(null);
  };

  const getLabelStyles = (label: string | null) => {
    switch (label) {
      case 'Quente':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Morno':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'Frio':
        return 'bg-info/10 text-info border-info/20';
      default:
        return '';
    }
  };

  return (
    <AppLayout>
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
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
            <p className="text-sm text-muted-foreground mt-4">Carregando pessoas...</p>
          </div>
        ) : people?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-2xl bg-muted/50 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhuma pessoa encontrada</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {search ? 'Tente ajustar sua busca' : 'Adicione seu primeiro contato para começar'}
            </p>
            {!search && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Criar Primeiro Contato
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/30">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-center">Automotores</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people?.map((person, index) => (
                  <TableRow 
                    key={person.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {person.phone && (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {person.phone}
                          </span>
                        )}
                        {person.email && (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {person.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {person.organizations ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          {person.organizations.name}
                        </span>
                      ) : <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {person.organizations?.cnpj || <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {person.organizations?.address_city 
                        ? `${person.organizations.address_city}/${person.organizations.address_state || ''}`
                        : <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center">
                      {person.organizations?.automotores ?? <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {person.job_title || <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell>
                      {person.label && (
                        <Badge variant="outline" className={getLabelStyles(person.label)}>
                          {person.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(person)}
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(person)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
