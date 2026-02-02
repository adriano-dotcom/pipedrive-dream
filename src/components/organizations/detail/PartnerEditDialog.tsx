import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Loader2, Mail, Phone, Briefcase } from 'lucide-react';
import { useUpdatePartner } from '@/hooks/useUpdatePartner';
import { OrganizationPartner } from '@/hooks/useOrganizationPartners';

interface PartnerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: OrganizationPartner;
  organizationId: string;
  onSuccess?: () => void;
}

export function PartnerEditDialog({
  open,
  onOpenChange,
  partner,
  organizationId,
  onSuccess,
}: PartnerEditDialogProps) {
  const [email, setEmail] = useState(partner.email || '');
  const [phone, setPhone] = useState(partner.phone || '');
  const [jobTitle, setJobTitle] = useState(partner.job_title || '');

  const updateMutation = useUpdatePartner(organizationId);

  // Reset form when partner changes
  useEffect(() => {
    setEmail(partner.email || '');
    setPhone(partner.phone || '');
    setJobTitle(partner.job_title || '');
  }, [partner]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateMutation.mutate(
      {
        partnerId: partner.id,
        data: {
          email: email.trim() || null,
          phone: phone.trim() || null,
          job_title: jobTitle.trim() || null,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Dados de Contato</DialogTitle>
          <DialogDescription>
            Adicione informações de contato para <strong>{partner.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone
            </Label>
            <PhoneInput
              value={phone}
              onValueChange={setPhone}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Cargo
            </Label>
            <Input
              id="jobTitle"
              placeholder="Ex: Diretor Comercial"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
