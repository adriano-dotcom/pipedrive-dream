import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { useOrganizationPartners, OrganizationPartner } from '@/hooks/useOrganizationPartners';
import { useOrganizationPeople, OrganizationPerson } from '@/hooks/useOrganizationPeople';
import { useUnlinkPartnerFromPerson } from '@/hooks/useLinkPartnerToPerson';
import { LinkPartnerToPersonDialog } from './LinkPartnerToPersonDialog';
import { PartnerEditDialog } from './PartnerEditDialog';
import { ConvertPartnerToPersonDialog } from './ConvertPartnerToPersonDialog';
import { PartnerCard } from './PartnerCard';

interface OrganizationPartnersProps {
  organizationId: string;
  organizationName?: string;
}

export function OrganizationPartners({ organizationId, organizationName }: OrganizationPartnersProps) {
  const { partners, isLoading: partnersLoading, isError } = useOrganizationPartners(organizationId);
  const { people, isLoading: peopleLoading } = useOrganizationPeople(organizationId);
  const unlinkMutation = useUnlinkPartnerFromPerson(organizationId);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<OrganizationPartner | null>(null);

  const isLoading = partnersLoading || peopleLoading;

  // Find linked person for each partner
  const getLinkedPerson = (partnerId: string): OrganizationPerson | undefined => {
    return people.find((person) => person.partner_id === partnerId);
  };

  const handleEditClick = (partner: OrganizationPartner) => {
    setSelectedPartner(partner);
    setEditDialogOpen(true);
  };

  const handleConvertClick = (partner: OrganizationPartner) => {
    setSelectedPartner(partner);
    setConvertDialogOpen(true);
  };

  const handleLinkClick = (partner: OrganizationPartner) => {
    setSelectedPartner(partner);
    setLinkDialogOpen(true);
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
              organizationId={organizationId}
              onEditClick={handleEditClick}
              onConvertClick={handleConvertClick}
              onLinkClick={handleLinkClick}
              onUnlinkClick={handleUnlinkClick}
              isUnlinking={unlinkMutation.isPending}
            />
          ))}
        </CardContent>
      </Card>

      {selectedPartner && (
        <>
          <LinkPartnerToPersonDialog
            open={linkDialogOpen}
            onOpenChange={setLinkDialogOpen}
            partner={selectedPartner}
            people={people}
            organizationId={organizationId}
            onSuccess={handleDialogSuccess}
          />
          <PartnerEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            partner={selectedPartner}
            organizationId={organizationId}
            onSuccess={handleDialogSuccess}
          />
          <ConvertPartnerToPersonDialog
            open={convertDialogOpen}
            onOpenChange={setConvertDialogOpen}
            partner={selectedPartner}
            organizationId={organizationId}
            organizationName={organizationName}
            onSuccess={handleDialogSuccess}
          />
        </>
      )}
    </>
  );
}
