import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2 } from 'lucide-react';
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
import { formatCnpj } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

interface OrganizationSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeId: string;
  onSelect: (organization: Organization) => void;
}

export function OrganizationSearchDialog({
  open,
  onOpenChange,
  excludeId,
  onSelect,
}: OrganizationSearchDialogProps) {
  const [search, setSearch] = useState('');

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations-search', search],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('*')
        .neq('id', excludeId)
        .order('name')
        .limit(20);

      if (search) {
        query = query.or(`name.ilike.%${search}%,cnpj.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Organization[];
    },
    enabled: open,
  });

  const handleSelect = (organization: Organization) => {
    onSelect(organization);
    onOpenChange(false);
    setSearch('');
  };

  const getLabelColor = (label: string | null) => {
    switch (label) {
      case 'Quente':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Morno':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Frio':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar Organização para Mesclar</DialogTitle>
          <DialogDescription>
            Busque e selecione a organização que deseja mesclar com a atual.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ ou email..."
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
          ) : organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Nenhuma organização encontrada' : 'Digite para buscar organizações'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {organizations.map((org) => (
                <Button
                  key={org.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-4 hover:bg-muted"
                  onClick={() => handleSelect(org)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{org.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {org.cnpj ? formatCnpj(org.cnpj) : org.email || 'Sem CNPJ'}
                      </div>
                      {org.address_city && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {org.address_city}/{org.address_state}
                        </div>
                      )}
                    </div>
                    {org.label && (
                      <Badge variant="secondary" className={`shrink-0 ${getLabelColor(org.label)}`}>
                        {org.label}
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
