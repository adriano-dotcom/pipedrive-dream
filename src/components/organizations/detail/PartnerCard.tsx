import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  User, Calendar, Shield, Building2, Link2, Unlink, Loader2, 
  Pencil, UserPlus, Mail, Phone, MessageCircle, FileText 
} from 'lucide-react';
import { EmailButton } from '@/components/email/EmailButton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { OrganizationPartner } from '@/hooks/useOrganizationPartners';
import { OrganizationPerson } from '@/hooks/useOrganizationPeople';
import { useUpdatePartner } from '@/hooks/useUpdatePartner';
interface PartnerCardProps {
  partner: OrganizationPartner;
  linkedPerson: OrganizationPerson | undefined;
  organizationId: string;
  onEditClick: (partner: OrganizationPartner) => void;
  onConvertClick: (partner: OrganizationPartner) => void;
  onLinkClick: (partner: OrganizationPartner) => void;
  onUnlinkClick: (personId: string) => void;
  isUnlinking: boolean;
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

function formatPhoneUrl(phone: string): string {
  // Remove caracteres não numéricos exceto +
  return 'tel:' + phone.replace(/[^\d+]/g, '');
}

function formatWhatsAppUrl(phone: string): string {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Adiciona código do Brasil (55) se não tiver
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  return `https://wa.me/${cleaned}`;
}

export function PartnerCard({ 
  partner, 
  linkedPerson,
  organizationId,
  onEditClick, 
  onConvertClick,
  onLinkClick, 
  onUnlinkClick, 
  isUnlinking 
}: PartnerCardProps) {
  const hasLegalRep = partner.legal_rep_name;
  const hasContactInfo = partner.email || partner.phone || partner.whatsapp;
  
  // State for inline notes editing
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(partner.notes || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateMutation = useUpdatePartner(organizationId);

  // Sync localNotes when partner.notes changes
  useEffect(() => {
    setLocalNotes(partner.notes || '');
  }, [partner.notes]);

  // Auto-focus textarea when editing
  useEffect(() => {
    if (isEditingNotes && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditingNotes]);

  const handleNotesBlur = () => {
    const trimmedNotes = localNotes.trim();
    if (trimmedNotes !== (partner.notes || '')) {
      updateMutation.mutate({
        partnerId: partner.id,
        data: { notes: trimmedNotes || null }
      });
    }
    setIsEditingNotes(false);
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleNotesBlur();
    }
    if (e.key === 'Escape') {
      setLocalNotes(partner.notes || '');
      setIsEditingNotes(false);
    }
  };

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
          
          {(partner.job_title || partner.qualification) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {partner.job_title || partner.qualification}
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

          {/* Contact info display */}
          {hasContactInfo && (
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              {partner.email && (
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {partner.email}
                  </span>
                  <EmailButton
                    entityType="organization"
                    entityId={organizationId}
                    entityName={partner.name}
                    recipientEmail={partner.email}
                    recipientName={partner.name}
                    size="icon"
                  />
                </div>
              )}
              {partner.phone && (
                <a
                  href={formatPhoneUrl(partner.phone)}
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {partner.phone}
                </a>
              )}
              {partner.whatsapp && (
                <a
                  href={formatWhatsAppUrl(partner.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline"
                >
                  <MessageCircle className="h-3 w-3" />
                  {partner.whatsapp}
                </a>
              )}
            </div>
          )}
          
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

          {/* Notes section */}
          <div className="mt-3 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <FileText className="h-3 w-3" />
              <span className="font-medium">Observações</span>
              {updateMutation.isPending && (
                <Loader2 className="h-3 w-3 animate-spin ml-1" />
              )}
            </div>
            
            {isEditingNotes ? (
              <Textarea
                ref={textareaRef}
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={handleNotesBlur}
                onKeyDown={handleNotesKeyDown}
                placeholder="Adicione observações sobre este sócio..."
                className="min-h-[60px] text-xs resize-none"
              />
            ) : (
              <div
                onClick={() => setIsEditingNotes(true)}
                className="cursor-pointer text-xs min-h-[32px] p-2 rounded-md border border-transparent hover:border-border hover:bg-muted/30 transition-colors"
              >
                {partner.notes ? (
                  <p className="text-foreground whitespace-pre-wrap">{partner.notes}</p>
                ) : (
                  <p className="text-muted-foreground italic">Clique para adicionar observações...</p>
                )}
              </div>
            )}
          </div>

          {/* Actions section */}
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
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onEditClick(partner)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar dados de contato</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onEditClick(partner)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar dados de contato</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onConvertClick(partner)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Criar Pessoa
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Converter sócio em pessoa do CRM</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onLinkClick(partner)}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Vincular Existente
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Vincular com pessoa já cadastrada</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
