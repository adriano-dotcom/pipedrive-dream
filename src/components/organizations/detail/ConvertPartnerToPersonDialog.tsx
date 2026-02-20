import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, Phone, Briefcase, Building2, FileText } from 'lucide-react';
import { useConvertPartnerToPerson } from '@/hooks/useConvertPartnerToPerson';
import { OrganizationPartner } from '@/hooks/useOrganizationPartners';

interface ConvertPartnerToPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: OrganizationPartner;
  organizationId: string;
  organizationName?: string;
  onSuccess?: () => void;
}

function formatCpf(doc: string | null): string {
  if (!doc) return '—';
  const clean = doc.replace(/\D/g, '');
  if (clean.length !== 11) return doc; // Não é CPF
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

function isValidCpf(doc: string | null): boolean {
  if (!doc) return false;
  const clean = doc.replace(/\D/g, '');
  return clean.length === 11;
}

export function ConvertPartnerToPersonDialog({
  open,
  onOpenChange,
  partner,
  organizationId,
  organizationName,
  onSuccess,
}: ConvertPartnerToPersonDialogProps) {
  const [setAsPrimary, setSetAsPrimary] = useState(false);
  const convertMutation = useConvertPartnerToPerson(organizationId);

  // Determinar cargo: usar job_title customizado ou qualification da RF
  const effectiveJobTitle = partner.job_title || partner.qualification;

  const handleConvert = () => {
    convertMutation.mutate(
      {
        partnerId: partner.id,
        name: partner.name,
        cpf: partner.document,
        email: partner.email,
        phone: partner.phone,
        job_title: effectiveJobTitle,
        organizationId,
        setAsPrimaryContact: setAsPrimary,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const hasContactInfo = partner.email || partner.phone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Converter Sócio para Pessoa</DialogTitle>
          <DialogDescription>
            Uma nova pessoa será criada no CRM com os dados abaixo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview dos dados */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{partner.name}</span>
            </div>

            {isValidCpf(partner.document) && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono">{formatCpf(partner.document)}</span>
                <Badge variant="outline" className="text-xs">CPF</Badge>
              </div>
            )}

            {partner.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{partner.email}</span>
              </div>
            )}

            {partner.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{partner.phone}</span>
              </div>
            )}

            {effectiveJobTitle && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{effectiveJobTitle}</span>
              </div>
            )}

            {organizationName && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{organizationName}</span>
              </div>
            )}
          </div>

          {!hasContactInfo && (
            <p className="text-sm text-warning">
              ⚠️ Este sócio não possui email ou telefone cadastrado. 
              Você pode editar os dados antes de converter.
            </p>
          )}

          {/* Opção de contato principal */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="setPrimary"
              checked={setAsPrimary}
              onCheckedChange={(checked) => setSetAsPrimary(checked === true)}
            />
            <Label
              htmlFor="setPrimary"
              className="text-sm font-normal cursor-pointer"
            >
              Definir como contato principal da organização
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConvert}
            disabled={convertMutation.isPending}
          >
            {convertMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            Criar Pessoa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
