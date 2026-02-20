import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { User, Loader2, Link2 } from 'lucide-react';
import { OrganizationPartner } from '@/hooks/useOrganizationPartners';
import { OrganizationPerson } from '@/hooks/useOrganizationPeople';
import { useLinkPartnerToPerson } from '@/hooks/useLinkPartnerToPerson';

interface LinkPartnerToPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: OrganizationPartner;
  people: OrganizationPerson[];
  organizationId: string;
  onSuccess: () => void;
}

export function LinkPartnerToPersonDialog({
  open,
  onOpenChange,
  partner,
  people,
  organizationId,
  onSuccess,
}: LinkPartnerToPersonDialogProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [updateName, setUpdateName] = useState(true);
  const [updateCpf, setUpdateCpf] = useState(true);

  const linkMutation = useLinkPartnerToPerson(organizationId);

  // Filter out people already linked to other partners
  const availablePeople = people.filter(
    (person) => !person.partner_id || person.partner_id === partner.id
  );

  const selectedPerson = people.find((p) => p.id === selectedPersonId);
  const hasNameDifference = selectedPerson && selectedPerson.name !== partner.name;
  const hasCpfData = partner.document && partner.document.replace(/\D/g, '').length === 11;

  const handleSubmit = async () => {
    if (!selectedPersonId) return;

    await linkMutation.mutateAsync({
      personId: selectedPersonId,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerDocument: partner.document,
      updateName: updateName && !!hasNameDifference,
      updateCpf: updateCpf && !!hasCpfData,
    });

    onSuccess();
    onOpenChange(false);
    setSelectedPersonId('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedPersonId('');
    setUpdateName(true);
    setUpdateCpf(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Vincular Sócio com Pessoa
          </DialogTitle>
          <DialogDescription>
            Selecione a pessoa cadastrada que corresponde ao sócio do Quadro Societário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Partner info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1">Sócio (Receita Federal)</p>
            <p className="font-medium">{partner.name}</p>
            {partner.qualification && (
              <p className="text-sm text-muted-foreground">{partner.qualification}</p>
            )}
          </div>

          {/* People list */}
          <div className="space-y-2">
            <Label>Selecione a pessoa correspondente:</Label>
            
            {availablePeople.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma pessoa disponível para vincular.</p>
                <p className="text-xs mt-1">
                  Todas as pessoas já estão vinculadas a outros sócios ou não há pessoas cadastradas.
                </p>
              </div>
            ) : (
              <RadioGroup
                value={selectedPersonId}
                onValueChange={setSelectedPersonId}
                className="space-y-2"
              >
                {availablePeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedPersonId(person.id)}
                  >
                    <RadioGroupItem value={person.id} id={person.id} />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={person.id}
                        className="font-medium cursor-pointer flex items-center gap-2"
                      >
                        {person.name}
                        {person.partner_id === partner.id && (
                          <Badge variant="secondary" className="text-xs">
                            Já vinculado
                          </Badge>
                        )}
                      </Label>
                      {(person.job_title || person.email) && (
                        <p className="text-xs text-muted-foreground">
                          {person.job_title}
                          {person.job_title && person.email && ' • '}
                          {person.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Update options */}
          {selectedPersonId && (hasNameDifference || hasCpfData) && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm text-muted-foreground">
                Atualizar dados da pessoa:
              </Label>

              {hasNameDifference && (
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="update-name"
                    checked={updateName}
                    onCheckedChange={(checked) => setUpdateName(!!checked)}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="update-name" className="text-sm font-normal cursor-pointer">
                      Atualizar nome para "{partner.name}"
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Nome atual: {selectedPerson?.name}
                    </p>
                  </div>
                </div>
              )}

              {hasCpfData && (
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="update-cpf"
                    checked={updateCpf}
                    onCheckedChange={(checked) => setUpdateCpf(!!checked)}
                  />
                  <Label htmlFor="update-cpf" className="text-sm font-normal cursor-pointer">
                    Atualizar CPF com dados da Receita Federal
                  </Label>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPersonId || linkMutation.isPending}
          >
            {linkMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Vinculando...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Vincular
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
