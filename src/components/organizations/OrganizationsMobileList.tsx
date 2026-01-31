import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCnpj } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

type OrganizationWithContact = Organization & {
  primary_contact: {
    id?: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  is_fallback_contact?: boolean;
  fallback_contact_id?: string;
};

interface OrganizationsMobileListProps {
  organizations: OrganizationWithContact[];
  isAdmin: boolean;
  onEdit: (org: OrganizationWithContact) => void;
  onDelete: (org: OrganizationWithContact) => void;
}

const getLabelColor = (label: string | null) => {
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

export function OrganizationsMobileList({ 
  organizations, 
  isAdmin, 
  onEdit, 
  onDelete 
}: OrganizationsMobileListProps) {
  if (organizations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma organização encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {organizations.map((org) => (
        <div 
          key={org.id} 
          className="ios-glass p-4 rounded-xl space-y-3"
        >
          {/* Header with name and label */}
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/organizations/${org.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors flex-1"
            >
              {org.name}
            </Link>
            {org.label && (
              <Badge variant="outline" className={cn("text-xs flex-shrink-0", getLabelColor(org.label))}>
                {org.label}
              </Badge>
            )}
          </div>

          {/* Info */}
          <div className="space-y-1.5 text-sm">
            {org.cnpj && (
              <div className="text-muted-foreground font-mono text-xs">
                CNPJ: {formatCnpj(org.cnpj)}
              </div>
            )}
            {org.automotores != null && (
              <div className="text-muted-foreground text-xs">
                Automotores: {org.automotores}
              </div>
            )}
            {org.address_city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {org.address_city}/{org.address_state}
              </div>
            )}
          </div>

          {/* Primary Contact */}
          {org.primary_contact && (
            <div className="bg-muted/30 rounded-lg p-2.5 space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {org.is_fallback_contact ? 'Contato Vinculado' : 'Contato Principal'}
              </div>
              <Link 
                to={`/people/${org.is_fallback_contact ? org.fallback_contact_id : org.primary_contact_id}`}
                className={`text-sm font-medium hover:text-primary ${org.is_fallback_contact ? 'italic' : ''}`}
              >
                {org.primary_contact.name}
                {org.is_fallback_contact && (
                  <span className="text-xs ml-1 not-italic opacity-70">(vinculado)</span>
                )}
              </Link>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {org.primary_contact.phone && (
                  <a href={`tel:${org.primary_contact.phone}`} className="flex items-center gap-1 hover:text-primary">
                    <Phone className="h-3 w-3" />
                    {org.primary_contact.phone}
                  </a>
                )}
                {org.primary_contact.email && (
                  <a href={`mailto:${org.primary_contact.email}`} className="flex items-center gap-1 hover:text-primary">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{org.primary_contact.email}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(org)}
              className="flex-1"
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(org)}
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
