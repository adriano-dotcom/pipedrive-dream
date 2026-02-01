import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, User, Calendar, Shield, Building2, Link2, Unlink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOrganizationPartners, OrganizationPartner } from '@/hooks/useOrganizationPartners';
import { useOrganizationPeople, OrganizationPerson } from '@/hooks/useOrganizationPeople';
import { useUnlinkPartnerFromPerson } from '@/hooks/useLinkPartnerToPerson';
import { LinkPartnerToPersonDialog } from './LinkPartnerToPersonDialog';
import { Link } from 'react-router-dom';

interface OrganizationPartnersProps {
  organizationId: string;
}

function maskDocument(doc: string | null): string {
  if (!doc) return '—';
  const clean = doc.replace(/\D/g, '');
  
  // CPF: ###.###.###-## -> ***.***.###-##
  if (clean.length === 11) {
    return `***.***. ${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  
  // CNPJ: ##.###.###/####-## -> **.***.***/####-##
  if (clean.length === 14) {
    return `**.***.***/****-${clean.slice(12)}`;
  }
  
  // Fallback: mask first half
  const halfLen = Math.floor(clean.length / 2);
  return '*'.repeat(halfLen) + clean.slice(halfLen);
}

interface PartnerCardProps {
  partner: OrganizationPartner;
  linkedPerson: OrganizationPerson | undefined;
  onLinkClick: (partner: OrganizationPartner) => void;
  onUnlinkClick: (personId: string) => void;
  isUnlinking: boolean;
}

function PartnerCard({ partner, linkedPerson, onLinkClick, onUnlinkClick, isUnlinking }: PartnerCardProps) {
  const hasLegalRep = partner.legal_rep_name;

  return (
    <div className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">{partner.name}</h4>
            {hasLegalRep && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Rep. Legal
              </Badge>
            )}
          </div>
          
          {partner.qualification && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {partner.qualification}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {partner.document && (
              <span className="font-mono">{maskDocument(partner.document)}</span>
            )}
            
            {partner.entry_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Desde {format(new Date(partner.entry_date), 'MM/yyyy', { locale: ptBR })}
              </span>
            )}
            
            {partner.country && partner.country !== 'Brasil' && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {partner.country}
              </span>
            )}
          </div>
          
          {hasLegalRep && (
            <div className="mt-2 pl-3 border-l-2 border-primary/20">
              <p className="text-xs text-muted-foreground">
                Representante: <span className="font-medium text-foreground">{partner.legal_rep_name}</span>
                {partner.legal_rep_qualification && (
                  <span className="text-muted-foreground"> • {partner.legal_rep_qualification}</span>
                )}
              </p>
            </div>
          )}

          {/* Link/Unlink section */}
          <div className="mt-3 pt-3 border-t border-border/50">
            {linkedPerson ? (
              <div className="flex items-center justify-between gap-2">
                <Link
                  to={`/people/${linkedPerson.id}`}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Link2 className="h-3 w-3" />
                  Vinculado: {linkedPerson.name}
                </Link>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => onUnlinkClick(linkedPerson.id)}
                        disabled={isUnlinking}
                      >
                        {isUnlinking ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Unlink className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Desvincular pessoa</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onLinkClick(partner)}
              >
                <Link2 className="h-3 w-3 mr-1" />
                Vincular com Pessoa
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrganizationPartners({ organizationId }: OrganizationPartnersProps) {
  const { partners, isLoading: partnersLoading, isError } = useOrganizationPartners(organizationId);
  const { people, isLoading: peopleLoading } = useOrganizationPeople(organizationId);
  const unlinkMutation = useUnlinkPartnerFromPerson(organizationId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<OrganizationPartner | null>(null);

  const isLoading = partnersLoading || peopleLoading;

  // Find linked person for each partner
  const getLinkedPerson = (partnerId: string): OrganizationPerson | undefined => {
    return people.find((person) => person.partner_id === partnerId);
  };

  const handleLinkClick = (partner: OrganizationPartner) => {
    setSelectedPartner(partner);
    setDialogOpen(true);
  };

  const handleUnlinkClick = (personId: string) => {
    unlinkMutation.mutate(personId);
  };

  const handleDialogSuccess = () => {
    setSelectedPartner(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Quadro Societário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Quadro Societário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Erro ao carregar sócios.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (partners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Quadro Societário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum sócio cadastrado.</p>
            <p className="text-xs mt-1">
              Clique em "Atualizar via RF" para buscar o quadro societário.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Quadro Societário
            <Badge variant="secondary" className="ml-auto">
              {partners.length} {partners.length === 1 ? 'sócio' : 'sócios'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {partners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              linkedPerson={getLinkedPerson(partner.id)}
              onLinkClick={handleLinkClick}
              onUnlinkClick={handleUnlinkClick}
              isUnlinking={unlinkMutation.isPending}
            />
          ))}
        </CardContent>
      </Card>

      {selectedPartner && (
        <LinkPartnerToPersonDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          partner={selectedPartner}
          people={people}
          organizationId={organizationId}
          onSuccess={handleDialogSuccess}
        />
      )}
    </>
  );
}
