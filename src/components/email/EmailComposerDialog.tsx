import { useState, useEffect } from 'react';
import { Sparkles, Send, FileText, Loader2, Globe, Search, ChevronDown, ExternalLink } from 'lucide-react';
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
}

export function EmailComposerDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  recipientEmail = '',
  recipientName = '',
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

  const handleResearchAndGenerate = async () => {
    const result = await researchAndGenerate({
      organizationId: entityId,
      recipientName: recipientName || to,
      emailType,
      customInstructions: customInstructions || undefined,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Novo E-mail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From field */}
          <div className="space-y-2">
            <Label>De</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
          </div>

          {/* To field */}
          <div className="space-y-2">
            <Label>Para</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@exemplo.com" type="email" />
          </div>

          {/* Quick actions row */}
          <div className="flex flex-wrap gap-2">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-[200px]">
                <FileText className="h-4 w-4 mr-2" />
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
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposal">Proposta</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
                <SelectItem value="introduction">Apresentação</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleGenerateEmail} disabled={isGenerating || isResearching} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Escreva meu email
            </Button>
          </div>

          {/* Research section - only for organizations */}
          {entityType === 'organization' && (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <Label className="font-medium text-primary">Pesquisa inteligente com IA</Label>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">Beta</Badge>
              </div>

              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Instruções opcionais: ex. 'Focar em seguro de frota', 'Mencionar a nova filial inaugurada'..."
                className="min-h-[60px] text-sm"
              />

              <Button
                onClick={handleResearchAndGenerate}
                disabled={isResearching || isGenerating}
                className="w-full gap-2"
                variant="default"
              >
                {isResearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {phaseLabel}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Pesquisar empresa e gerar email
                  </>
                )}
              </Button>

              {/* Research summary collapsible */}
              {phase === 'done' && researchSummary && (
                <Collapsible open={researchOpen} onOpenChange={setResearchOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-primary hover:underline w-full">
                    <ChevronDown className={`h-4 w-4 transition-transform ${researchOpen ? 'rotate-180' : ''}`} />
                    Ver resumo da pesquisa ({citations.length} fonte{citations.length !== 1 ? 's' : ''})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    <div className="text-sm bg-background rounded-lg p-3 border whitespace-pre-wrap">
                      {researchSummary}
                    </div>
                    {citations.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Fontes:</p>
                        {citations.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline truncate"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {url}
                          </a>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* Subject field */}
          <div className="space-y-2">
            <Label>Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email" />
          </div>

          {/* Body editor */}
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <RichTextEditor content={body} onChange={setBody} placeholder="Escreva sua mensagem aqui..." minHeight="200px" />
          </div>

          {/* Signature preview */}
          {signature?.signature_html && (
            <div className="text-sm text-muted-foreground border-t pt-4">
              <p className="mb-2 font-medium">Assinatura (será adicionada automaticamente):</p>
              <div className="text-xs bg-muted/50 p-3 rounded-lg" dangerouslySetInnerHTML={{ __html: sanitizeHtml(signature.signature_html) }} />
            </div>
          )}

          {/* Send button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSend} disabled={!to || !subject || !body || isSending} className="gap-2">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
