import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
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

interface ContactSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeId: string;
  onSelect: (person: PersonWithOrg) => void;
}

export function ContactSearchDialog({
  open,
  onOpenChange,
  excludeId,
  onSelect,
}: ContactSearchDialogProps) {
  const [search, setSearch] = useState('');

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people-search', search],
    queryFn: async () => {
      let query = supabase
        .from('people')
        .select('*, organizations:organizations!people_organization_id_fkey(id, name, cnpj, address_city, address_state, automotores)')
        .neq('id', excludeId)
        .order('name')
        .limit(20);

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PersonWithOrg[];
    },
    enabled: open,
  });

  const handleSelect = (person: PersonWithOrg) => {
    onSelect(person);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar Contato para Mesclar</DialogTitle>
          <DialogDescription>
            Busque e selecione o contato que deseja mesclar com o atual.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : people.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Nenhum contato encontrado' : 'Digite para buscar contatos'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {people.map((person) => (
                <Button
                  key={person.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-4 hover:bg-muted"
                  onClick={() => handleSelect(person)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{person.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {person.email || person.phone || 'Sem contato'}
                      </div>
                      {person.organizations && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {person.organizations.name}
                        </div>
                      )}
                    </div>
                    {person.label && (
                      <Badge variant="secondary" className="shrink-0">
                        {person.label}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
