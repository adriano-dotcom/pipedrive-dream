import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Mail, 
  Phone, 
  Briefcase, 
  MessageCircle,
  FileText,
  User, 
  CalendarIcon,
  Globe,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpdatePartner } from '@/hooks/useUpdatePartner';
import { OrganizationPartner } from '@/hooks/useOrganizationPartners';

interface PartnerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: OrganizationPartner;
  organizationId: string;
  onSuccess?: () => void;
}

const QUALIFICATION_OPTIONS = [
  { value: 'Sócio-Administrador', label: 'Sócio-Administrador' },
  { value: 'Sócio', label: 'Sócio' },
  { value: 'Diretor', label: 'Diretor' },
  { value: 'Presidente', label: 'Presidente' },
  { value: 'Acionista', label: 'Acionista' },
  { value: 'Procurador', label: 'Procurador' },
  { value: 'Outro', label: 'Outro' },
];

const COUNTRY_OPTIONS = [
  { value: 'Brasil', label: 'Brasil' },
  { value: 'Estados Unidos', label: 'Estados Unidos' },
  { value: 'Portugal', label: 'Portugal' },
  { value: 'Argentina', label: 'Argentina' },
  { value: 'Outro', label: 'Outro' },
];

export function PartnerEditDialog({
  open,
  onOpenChange,
  partner,
  organizationId,
  onSuccess,
}: PartnerEditDialogProps) {
  // Dados pessoais
  const [name, setName] = useState(partner.name || '');
  const [document, setDocument] = useState(partner.document || '');
  const [qualification, setQualification] = useState(partner.qualification || '');
  const [entryDate, setEntryDate] = useState<Date | undefined>(
    partner.entry_date ? new Date(partner.entry_date) : undefined
  );
  const [country, setCountry] = useState(partner.country || '');
  
  // Contato
  const [email, setEmail] = useState(partner.email || '');
  const [phone, setPhone] = useState(partner.phone || '');
  const [whatsapp, setWhatsapp] = useState(partner.whatsapp || '');
  const [jobTitle, setJobTitle] = useState(partner.job_title || '');
  
  // Representante legal
  const [legalRepName, setLegalRepName] = useState(partner.legal_rep_name || '');
  const [legalRepDocument, setLegalRepDocument] = useState(partner.legal_rep_document || '');
  const [legalRepQualification, setLegalRepQualification] = useState(partner.legal_rep_qualification || '');
  
  // Observações
  const [notes, setNotes] = useState(partner.notes || '');

  const updateMutation = useUpdatePartner(organizationId);

  // Reset form when partner changes
  useEffect(() => {
    setName(partner.name || '');
    setDocument(partner.document || '');
    setQualification(partner.qualification || '');
    setEntryDate(partner.entry_date ? new Date(partner.entry_date) : undefined);
    setCountry(partner.country || '');
    setEmail(partner.email || '');
    setPhone(partner.phone || '');
    setWhatsapp(partner.whatsapp || '');
    setJobTitle(partner.job_title || '');
    setLegalRepName(partner.legal_rep_name || '');
    setLegalRepDocument(partner.legal_rep_document || '');
    setLegalRepQualification(partner.legal_rep_qualification || '');
    setNotes(partner.notes || '');
  }, [partner]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    updateMutation.mutate(
      {
        partnerId: partner.id,
        data: {
          // Dados pessoais
          name: name.trim(),
          document: document.trim() || null,
          qualification: qualification || null,
          entry_date: entryDate ? format(entryDate, 'yyyy-MM-dd') : null,
          country: country || null,
          // Contato
          email: email.trim() || null,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          job_title: jobTitle.trim() || null,
          // Representante legal
          legal_rep_name: legalRepName.trim() || null,
          legal_rep_document: legalRepDocument.trim() || null,
          legal_rep_qualification: legalRepQualification.trim() || null,
          // Observações
          notes: notes.trim() || null,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Sócio</DialogTitle>
          <DialogDescription>
            Edite as informações de <strong>{partner.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Dados Pessoais
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="document" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CPF/CNPJ
                  </Label>
                  <Input
                    id="document"
                    placeholder="Documento"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Qualificação</Label>
                  <Select value={qualification} onValueChange={setQualification}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALIFICATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Data de Entrada
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !entryDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {entryDate ? format(entryDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={entryDate}
                        onSelect={setEntryDate}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    País
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" />
              Contato
            </div>
            
            <div className="space-y-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
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
                  <Label className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Label>
                  <PhoneInput
                    value={whatsapp}
                    onValueChange={setWhatsapp}
                    placeholder="(00) 00000-0000"
                  />
                </div>
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
            </div>
          </div>

          <Separator />

          {/* Representante Legal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              Representante Legal (opcional)
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="legalRepName">Nome do Representante</Label>
                <Input
                  id="legalRepName"
                  placeholder="Nome completo"
                  value={legalRepName}
                  onChange={(e) => setLegalRepName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="legalRepDocument">Documento</Label>
                  <Input
                    id="legalRepDocument"
                    placeholder="CPF/CNPJ"
                    value={legalRepDocument}
                    onChange={(e) => setLegalRepDocument(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legalRepQualification">Qualificação</Label>
                  <Input
                    id="legalRepQualification"
                    placeholder="Ex: Procurador"
                    value={legalRepQualification}
                    onChange={(e) => setLegalRepQualification(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Observações */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Observações
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas pessoais</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre este sócio..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] resize-none"
              />
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
            <Button type="submit" disabled={updateMutation.isPending || !name.trim()}>
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
