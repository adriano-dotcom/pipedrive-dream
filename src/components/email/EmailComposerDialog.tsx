import { useState, useEffect } from 'react';
import { Sparkles, Send, FileText, Loader2, Globe, Search, ChevronDown, ExternalLink, Mail } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useSentEmails } from '@/hooks/useSentEmails';
import { useGenerateEmail } from '@/hooks/useGenerateEmail';
import { useUserSignature } from '@/hooks/useUserSignature';
import { useResearchAndGenerateEmail } from '@/hooks/useResearchAndGenerateEmail';
import { useAuth } from '@/contexts/AuthContext';

interface EmailComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'deal' | 'person' | 'organization';
  entityId: string;
  entityName: string;
  recipientEmail?: string;
  recipientName?: string;
  organizationId?: string;
}

export function EmailComposerDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  recipientEmail = '',
  recipientName = '',
  organizationId,
}: EmailComposerDialogProps) {
  const { user } = useAuth();
  const { templates } = useEmailTemplates();
  const { sendEmail, isSending } = useSentEmails(entityType, entityId);
  const { generateEmail, isGenerating } = useGenerateEmail();
  const { signature } = useUserSignature();
  const { phase, researchSummary, citations, researchAndGenerate, reset: resetResearch, isLoading: isResearching } = useResearchAndGenerateEmail();

  const [to, setTo] = useState(recipientEmail);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [emailType, setEmailType] = useState<'proposal' | 'followup' | 'introduction' | 'custom'>('proposal');
  const [customInstructions, setCustomInstructions] = useState('');
  const [researchOpen, setResearchOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(recipientEmail);
      setSubject('');
      setBody('');
      setSelectedTemplate('');
      setCustomInstructions('');
      setResearchOpen(false);
      resetResearch();
    }
  }, [open, recipientEmail]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setSubject(template.subject || '');
        setBody(template.body);
      }
    }
  }, [selectedTemplate, templates]);

  const handleGenerateEmail = async () => {
    const result = await generateEmail({
      entityType,
      entityName,
      recipientName: recipientName || to,
      emailType,
    });

    if (result) {
      setSubject(result.subject);
      setBody(result.body);
    }
  };

  const researchOrgId = entityType === 'organization' ? entityId : organizationId;
  const showResearchSection = entityType === 'organization' || !!organizationId;

  const handleResearchAndGenerate = async () => {
    if (!researchOrgId) return;
    const result = await researchAndGenerate({
      organizationId: researchOrgId,
      recipientName: recipientName || to,
      emailType,
      customInstructions: customInstructions || undefined,
      personId: entityType === 'person' ? entityId : undefined,
    });

    if (result) {
      setSubject(result.subject);
      setBody(result.body);
      setResearchOpen(true);
    }
  };

  const handleSend = async () => {
    if (!to || !subject || !body) return;

    let finalBody = body;
    if (signature?.signature_html) {
      finalBody += `<br><br>${signature.signature_html}`;
    }

    await sendEmail({
      to,
      toName: recipientName,
      subject,
      body: finalBody,
      entityType,
      entityId,
    });

    onOpenChange(false);
  };

  const phaseLabel = phase === 'researching'
    ? 'Pesquisando informações da empresa...'
    : phase === 'generating'
    ? 'Gerando email personalizado...'
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            Novo E-mail
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-4">
            {/* From / To compact grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">De</Label>
                <Input value={user?.email || ''} disabled className="bg-muted/50 h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Para</Label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@exemplo.com" type="email" className="h-9 text-sm" />
              </div>
            </div>

            {/* Quick actions bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  <SelectValue placeholder="Usar modelo" />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhum modelo salvo</SelectItem>
                  ) : (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={emailType} onValueChange={(v) => setEmailType(v as typeof emailType)}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposal">Proposta</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="introduction">Apresentação</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleGenerateEmail} disabled={isGenerating || isResearching} className="gap-1.5 h-9">
                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Escreva meu email
              </Button>
            </div>

            {/* AI Research section - for organizations or people with linked org */}
            {showResearchSection && (
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/15">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">Pesquisa inteligente com IA</span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary px-1.5 py-0">Beta</Badge>
                </div>

                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Instruções opcionais: ex. 'Focar em seguro de frota', 'Mencionar a nova filial inaugurada'..."
                  className="min-h-[50px] text-sm resize-none"
                />

                <Button
                  onClick={handleResearchAndGenerate}
                  disabled={isResearching || isGenerating}
                  className="w-full gap-2 h-9"
                  size="sm"
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-sm">{phaseLabel}</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5" />
                      Pesquisar empresa e gerar email
                    </>
                  )}
                </Button>

                {/* Research summary with scroll */}
                {phase === 'done' && researchSummary && (
                  <Collapsible open={researchOpen} onOpenChange={setResearchOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-primary hover:underline w-full">
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${researchOpen ? 'rotate-180' : ''}`} />
                      Ver resumo da pesquisa ({citations.length} fonte{citations.length !== 1 ? 's' : ''})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      <ScrollArea className="max-h-[150px]">
                        <div className="text-sm bg-background/80 rounded-lg p-3 border whitespace-pre-wrap">
                          {researchSummary}
                        </div>
                      </ScrollArea>
                      {citations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {citations.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Badge variant="outline" className="text-[10px] gap-1 hover:bg-accent cursor-pointer font-normal max-w-[200px] truncate">
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                {new URL(url).hostname.replace('www.', '')}
                              </Badge>
                            </a>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Assunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email" className="h-9 text-sm" />
            </div>

            {/* Body editor */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mensagem</Label>
              <RichTextEditor content={body} onChange={setBody} placeholder="Escreva sua mensagem aqui..." minHeight="250px" />
            </div>

            {/* Signature preview */}
            {signature?.signature_html && (
              <div className="text-sm text-muted-foreground border-t border-border/50 pt-3">
                <p className="mb-1.5 text-xs font-medium">Assinatura (adicionada automaticamente):</p>
                <div className="text-xs bg-muted/30 p-2.5 rounded-lg" dangerouslySetInnerHTML={{ __html: sanitizeHtml(signature.signature_html) }} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Fixed footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSend} disabled={!to || !subject || !body || isSending} className="gap-2" size="sm">
            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar E-mail
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
