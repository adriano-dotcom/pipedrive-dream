import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Star, StarOff, Unlink, Pencil } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface ContactPersonItemProps {
  person: Person;
  isPrimary: boolean;
  onSetPrimary: (personId: string) => void;
  onUnlink: (personId: string) => void;
  onEdit?: (person: Person) => void;
}

export function ContactPersonItem({
  person,
  isPrimary,
  onSetPrimary,
  onUnlink,
  onEdit,
}: ContactPersonItemProps) {
  return (
    <div className="flex items-start justify-between p-3 border rounded-lg bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{person.name}</span>
          {isPrimary && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Principal
            </Badge>
          )}
        </div>
        {person.job_title && (
          <p className="text-sm text-muted-foreground">{person.job_title}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-1">
          {person.phone && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {person.phone}
            </span>
          )}
          {person.email && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {person.email}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSetPrimary(person.id)}
          title={isPrimary ? 'Remover como principal' : 'Definir como principal'}
        >
          {isPrimary ? (
            <StarOff className="h-4 w-4 text-amber-500" />
          ) : (
            <Star className="h-4 w-4" />
          )}
        </Button>
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(person)}
            title="Editar pessoa"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onUnlink(person.id)}
          title="Desvincular da organização"
        >
          <Unlink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
