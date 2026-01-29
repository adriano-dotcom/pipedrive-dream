import { Link } from 'react-router-dom';
import { Phone, Mail, Building2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export function PeopleMobileList({ people, isAdmin, onEdit, onDelete }: PeopleMobileListProps) {
  if (people.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum resultado encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {people.map((person) => (
        <div 
          key={person.id} 
          className="ios-glass p-4 rounded-xl space-y-3"
        >
          {/* Header with name and label */}
          <div className="flex items-start justify-between gap-2">
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
  );
}
