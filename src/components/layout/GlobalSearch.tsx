import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Search, Building2, Users, Briefcase, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  collapsed?: boolean;
}

export function GlobalSearch({ collapsed }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Keyboard shortcut (Ctrl+K / ⌘K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: async () => {
      const query = `%${searchQuery}%`;

      const [orgsResult, peopleResult, dealsResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('id, name, cnpj, email, phone')
          .or(`name.ilike.${query},cnpj.ilike.${query},email.ilike.${query},phone.ilike.${query}`)
          .limit(5),
        supabase
          .from('people')
          .select('id, name, email, phone, cpf')
          .or(`name.ilike.${query},email.ilike.${query},phone.ilike.${query},cpf.ilike.${query}`)
          .limit(5),
        supabase
          .from('deals')
          .select('id, title, policy_number')
          .or(`title.ilike.${query},policy_number.ilike.${query}`)
          .limit(5),
      ]);

      return {
        organizations: orgsResult.data || [],
        people: peopleResult.data || [],
        deals: dealsResult.data || [],
      };
    },
    enabled: searchQuery.length >= 2,
  });

  const hasResults = results && (
    results.organizations.length > 0 ||
    results.people.length > 0 ||
    results.deals.length > 0
  );

  const handleSelect = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'w-full justify-start text-muted-foreground hover:text-foreground border-border/50 bg-background/50 hover:bg-accent/50',
          collapsed ? 'px-2 justify-center' : 'px-3'
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        {!collapsed && (
          <>
            <span className="ml-2 flex-1 text-left text-sm">Buscar no CRM...</span>
            <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </>
        )}
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar por nome, email, telefone, CNPJ, CPF..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="py-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          )}

          {!isLoading && searchQuery.length < 2 && (
            <CommandEmpty>
              Digite pelo menos 2 caracteres para buscar
            </CommandEmpty>
          )}

          {!isLoading && searchQuery.length >= 2 && !hasResults && (
            <CommandEmpty>
              Nenhum resultado encontrado para "{searchQuery}"
            </CommandEmpty>
          )}

          {results?.organizations && results.organizations.length > 0 && (
            <CommandGroup heading="Organizações">
              {results.organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  value={`org-${org.id}`}
                  onSelect={() => handleSelect(`/organizations/${org.id}`)}
                  className="cursor-pointer"
                >
                  <Building2 className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{org.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {org.cnpj || org.email || org.phone || 'Sem informações adicionais'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results?.people && results.people.length > 0 && (
            <CommandGroup heading="Pessoas">
              {results.people.map((person) => (
                <CommandItem
                  key={person.id}
                  value={`person-${person.id}`}
                  onSelect={() => handleSelect(`/people/${person.id}`)}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4 text-success" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{person.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {person.email || person.phone || person.cpf || 'Sem informações adicionais'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results?.deals && results.deals.length > 0 && (
            <CommandGroup heading="Negócios">
              {results.deals.map((deal) => (
                <CommandItem
                  key={deal.id}
                  value={`deal-${deal.id}`}
                  onSelect={() => handleSelect(`/deals/${deal.id}`)}
                  className="cursor-pointer"
                >
                  <Briefcase className="mr-2 h-4 w-4 text-warning" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{deal.title}</span>
                    {deal.policy_number && (
                      <span className="text-xs text-muted-foreground truncate">
                        Apólice: {deal.policy_number}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
