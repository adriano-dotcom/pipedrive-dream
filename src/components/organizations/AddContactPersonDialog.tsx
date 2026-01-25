import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Search, Loader2, UserPlus, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface AddContactPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
  excludePersonIds: string[];
  onPersonLinked: (person: Person) => void;
  onPersonCreated: (person: Person) => void;
}

export function AddContactPersonDialog({
  open,
  onOpenChange,
  organizationId,
  excludePersonIds,
  onPersonLinked,
  onPersonCreated,
}: AddContactPersonDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  
  // New person form state
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonJobTitle, setNewPersonJobTitle] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonWhatsapp, setNewPersonWhatsapp] = useState('');

  // Search existing people
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['people-search', searchQuery, excludePersonIds],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .not('id', 'in', `(${excludePersonIds.length > 0 ? excludePersonIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
        .limit(10);
      
      if (error) throw error;
      return data as Person[];
    },
    enabled: searchQuery.length >= 2,
  });

  // Link existing person
  const linkMutation = useMutation({
    mutationFn: async (personId: string) => {
      if (!organizationId) return;
      
      const { data, error } = await supabase
        .from('people')
        .update({ organization_id: organizationId })
        .eq('id', personId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Person;
    },
    onSuccess: (person) => {
      if (person) {
        queryClient.invalidateQueries({ queryKey: ['organization-contacts'] });
        queryClient.invalidateQueries({ queryKey: ['people'] });
        onPersonLinked(person);
        toast.success('Pessoa vinculada com sucesso!');
        onOpenChange(false);
        resetForm();
      }
    },
    onError: (error) => {
      toast.error('Erro ao vincular pessoa: ' + error.message);
    },
  });

  // Create new person
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .insert({
          name: newPersonName.trim(),
          job_title: newPersonJobTitle.trim() || null,
          phone: newPersonPhone.trim() || null,
          email: newPersonEmail.trim() || null,
          whatsapp: newPersonWhatsapp.trim() || null,
          organization_id: organizationId || null,
          owner_id: user?.id,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Person;
    },
    onSuccess: (person) => {
      queryClient.invalidateQueries({ queryKey: ['organization-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      onPersonCreated(person);
      toast.success('Pessoa criada com sucesso!');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao criar pessoa: ' + error.message);
    },
  });

  const resetForm = () => {
    setSearchQuery('');
    setNewPersonName('');
    setNewPersonJobTitle('');
    setNewPersonPhone('');
    setNewPersonEmail('');
    setNewPersonWhatsapp('');
    setActiveTab('search');
  };

  const handleCreatePerson = () => {
    if (!newPersonName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    createMutation.mutate();
  };

  const isCreating = createMutation.isPending;
  const isLinking = linkMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Pessoa de Contato</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Buscar Existente
            </TabsTrigger>
            <TabsTrigger value="create">
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Nova
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            <Command className="rounded-lg border" shouldFilter={false}>
              <CommandInput
                placeholder="Buscar por nome, email ou telefone..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-[250px]">
                {isSearching ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : searchQuery.length < 2 ? (
                  <CommandEmpty>
                    Digite pelo menos 2 caracteres para buscar
                  </CommandEmpty>
                ) : searchResults?.length === 0 ? (
                  <CommandEmpty>
                    Nenhuma pessoa encontrada
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {searchResults?.map((person) => (
                      <CommandItem
                        key={person.id}
                        value={person.name}
                        className="flex items-center justify-between cursor-pointer"
                        onSelect={() => {
                          if (!isLinking && organizationId) {
                            linkMutation.mutate(person.id);
                          }
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{person.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {person.email || person.phone || 'Sem contato'}
                          </p>
                          {person.organization_id && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              Já vinculada a outra organização
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            linkMutation.mutate(person.id);
                          }}
                          disabled={isLinking || !organizationId}
                        >
                          {isLinking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Link2 className="h-4 w-4 mr-1" />
                              Vincular
                            </>
                          )}
                        </Button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>

            {!organizationId && (
              <p className="text-xs text-muted-foreground text-center">
                Salve a organização primeiro para vincular pessoas existentes
              </p>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="new-person-name">Nome *</Label>
              <Input
                id="new-person-name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-person-job">Cargo</Label>
              <Input
                id="new-person-job"
                value={newPersonJobTitle}
                onChange={(e) => setNewPersonJobTitle(e.target.value)}
                placeholder="Ex: Gerente Comercial"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-person-phone">Telefone</Label>
                <PhoneInput
                  id="new-person-phone"
                  value={newPersonPhone}
                  onValueChange={setNewPersonPhone}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-person-whatsapp">WhatsApp</Label>
                <PhoneInput
                  id="new-person-whatsapp"
                  value={newPersonWhatsapp}
                  onValueChange={setNewPersonWhatsapp}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-person-email">Email</Label>
              <Input
                id="new-person-email"
                type="email"
                value={newPersonEmail}
                onChange={(e) => setNewPersonEmail(e.target.value)}
                placeholder="email@empresa.com"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCreatePerson}
              disabled={isCreating || !newPersonName.trim()}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Criar e Vincular
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
