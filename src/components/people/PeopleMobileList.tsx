import { Link } from 'react-router-dom';
import { Phone, Mail, Building2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
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

interface PeopleMobileListProps {
  people: PersonWithOrg[];
  isAdmin: boolean;
  onEdit: (person: PersonWithOrg) => void;
  onDelete: (person: PersonWithOrg) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onBulkDelete?: () => void;
}

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

export function PeopleMobileList({ people, isAdmin, onEdit, onDelete, selectedIds = [], onSelectionChange, onBulkDelete }: PeopleMobileListProps) {
  const handleToggleSelection = (personId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, personId]);
    } else {
      onSelectionChange?.(selectedIds.filter(id => id !== personId));
    }
  };

  if (people.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum resultado encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barra de ações em lote fixa */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedIds.length} selecionada(s)
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSelectionChange?.([]) }
            >
              Limpar
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={onBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          </div>
        </div>
      )}
      
      <div className="space-y-3 p-4">
      {people.map((person) => (
        <div 
          key={person.id} 
          className="ios-glass p-4 rounded-xl space-y-3"
        >
          {/* Header with checkbox, name and label */}
          <div className="flex items-start gap-3">
            {isAdmin && onSelectionChange && (
              <Checkbox
                checked={selectedIds.includes(person.id)}
                onCheckedChange={(checked) => handleToggleSelection(person.id, !!checked)}
                className="mt-1"
              />
            )}
            <div className="flex-1 flex items-start justify-between gap-2">
              <Link
                to={`/people/${person.id}`}
                className="font-semibold text-foreground hover:text-primary transition-colors flex-1"
              >
                {person.name}
              </Link>
              {person.label && (
                <Badge variant="outline" className={cn("text-xs flex-shrink-0", getLabelStyles(person.label))}>
                  {person.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-1.5 text-sm">
            {person.phone && (
              <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                <Phone className="h-3.5 w-3.5" />
                {person.phone}
              </a>
            )}
            {person.email && (
              <a href={`mailto:${person.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary truncate">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{person.email}</span>
              </a>
            )}
            {person.organizations && (
              <Link 
                to={`/organizations/${person.organizations.id}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <Building2 className="h-3.5 w-3.5" />
                {person.organizations.name}
              </Link>
            )}
            {person.job_title && (
              <div className="text-muted-foreground text-xs">
                {person.job_title}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(person)}
              className="flex-1"
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(person)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
