import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Send, FileText, Loader2, Mail, AlertTriangle, ChevronDown, ChevronUp, Users, Variable } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useGenerateEmail } from '@/hooks/useGenerateEmail';
import { useUserSignature } from '@/hooks/useUserSignature';
import { useBulkEmail } from '@/hooks/useBulkEmail';
import { ScrollArea } from '@/components/ui/scroll-area';

const TEMPLATE_VARIABLES = [
  { label: 'Primeiro Nome', variable: '{{primeiro_nome}}' },
  { label: 'Nome Completo', variable: '{{nome_completo}}' },
  { label: 'Empresa', variable: '{{empresa}}' },
  { label: 'Cidade', variable: '{{cidade}}' },
  { label: 'Cargo', variable: '{{cargo}}' },
  { label: 'Email', variable: '{{email}}' },
] as const;

interface CampaignComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  onSuccess?: () => void;
}

export function CampaignComposerDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  onSuccess,
}: CampaignComposerDialogProps) {
  const { templates } = useEmailTemplates();
  const { generateEmail, isGenerating } = useGenerateEmail();
  const { signature } = useUserSignature();
  const { sendCampaign, isSendingCampaign, getCampaignRecipients } = useBulkEmail();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [emailType, setEmailType] = useState<'proposal' | 'followup' | 'introduction' | 'custom'>('proposal');
  const [rateLimit, setRateLimit] = useState(10);
  const [showRecipients, setShowRecipients] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const validRecipients = useMemo(
    () => recipients.filter((r) => r.email && r.status !== 'bounced' && r.status !== 'blocked'),
    [recipients]
  );

  useEffect(() => {
    if (open && campaignId) {
      setSubject('');
      setBody('');
      setSelectedTemplate('');
      setShowRecipients(false);
      setLoadingRecipients(true);
      getCampaignRecipients(campaignId)
        .then(setRecipients)
        .catch(console.error)
        .finally(() => setLoadingRecipients(false));
    }
  }, [open, campaignId]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        setSubject(template.subject || '');
        setBody(template.body);
      }
    }
  }, [selectedTemplate, templates]);

  const handleGenerate = async () => {
    const result = await generateEmail({
      entityType: 'person',
      entityName: campaignName,
      recipientName: 'destinatários',
      emailType,
    });
    if (result) {
      setSubject(result.subject);
      setBody(result.body);
    }
  };

  const handleSend = async () => {
    if (!subject || !body || validRecipients.length === 0) return;

    let finalBody = body;
    if (signature?.signature_html) {
      finalBody += `<br><br>${signature.signature_html}`;
    }

    await sendCampaign({
      campaignId,
      subject,
      body: finalBody,
      rateLimit,
    });

    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar Campanha: {campaignName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients summary */}
          <div className="space-y-2">
            <Label>Para</Label>
            {loadingRecipients ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Carregando destinatários...</span>
              </div>
            ) : (
              <>
                <div
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setShowRecipients(!showRecipients)}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{validRecipients.length} destinatário(s)</span>
                  </div>
                  {showRecipients ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>

                {showRecipients && (
                  <ScrollArea className="max-h-40 border rounded-lg p-2">
                    <div className="space-y-1">
                      {recipients.map((r: any) => (
                        <div key={r.id} className="flex items-center gap-2 text-sm py-1">
                          <span className="font-medium">{r.name || '—'}</span>
                          <span className="text-muted-foreground">{r.email}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-[200px]">
                <FileText className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Usar modelo" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <SelectItem value="none" disabled>Nenhum modelo</SelectItem>
                ) : (
                  templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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

            <Button variant="outline" onClick={handleGenerate} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Escreva meu email
            </Button>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email" />
          </div>

          {/* Template Variables */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Variable className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Variáveis dinâmicas</Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <Badge
                  key={v.variable}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors select-none"
                  onClick={() => setBody((prev) => prev + v.variable)}
                >
                  {v.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Body */}
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

          {/* Rate limit */}
          <div className="space-y-2 border-t pt-4">
            <Label>Cadência de envio: {rateLimit} emails por lote</Label>
            <Slider value={[rateLimit]} onValueChange={(v) => setRateLimit(v[0])} min={1} max={50} step={1} />
            <p className="text-xs text-muted-foreground">
              Controla quantos emails são enviados por vez para evitar sobrecarga.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleSend}
              disabled={!subject || !body || validRecipients.length === 0 || isSendingCampaign || loadingRecipients}
              className="gap-2"
            >
              {isSendingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar para {validRecipients.length} pessoa(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
