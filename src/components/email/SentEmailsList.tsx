import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Plus, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSentEmails } from '@/hooks/useSentEmails';
import { EmailComposerDialog } from './EmailComposerDialog';
import { sanitizeHtml } from '@/lib/sanitize';

interface SentEmailsListProps {
  entityType: 'deal' | 'person' | 'organization';
  entityId: string;
  entityName: string;
  recipientEmail?: string;
  recipientName?: string;
}

export function SentEmailsList({
  entityType,
  entityId,
  entityName,
  recipientEmail,
  recipientName,
}: SentEmailsListProps) {
  const { emails, isLoading } = useSentEmails(entityType, entityId);
  const [composerOpen, setComposerOpen] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<typeof emails[0] | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">E-mails Enviados</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          E-mails Enviados
        </h3>
        <Button onClick={() => setComposerOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo E-mail
        </Button>
      </div>

      {emails.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="text-lg font-medium mb-2">Nenhum e-mail enviado</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Envie o primeiro e-mail para este {entityType === 'deal' ? 'negócio' : entityType === 'person' ? 'contato' : 'organização'}.
            </p>
            <Button onClick={() => setComposerOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Enviar E-mail
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <Card 
              key={email.id} 
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => setPreviewEmail(email)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{email.subject}</span>
                      {email.status === 'sent' ? (
                        <Badge variant="secondary" className="shrink-0 bg-success/10 text-success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enviado
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="shrink-0">
                          <XCircle className="h-3 w-3 mr-1" />
                          Falhou
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      Para: {email.to_name ? `${email.to_name} <${email.to_email}>` : email.to_email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(email.sent_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Email Composer Dialog */}
      <EmailComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        recipientEmail={recipientEmail}
        recipientName={recipientName}
      />

      {/* Email Preview Dialog */}
      <Dialog open={!!previewEmail} onOpenChange={() => setPreviewEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {previewEmail?.subject}
            </DialogTitle>
          </DialogHeader>
          {previewEmail && (
            <div className="space-y-4">
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong>De:</strong> {previewEmail.from_name ? `${previewEmail.from_name} <${previewEmail.from_email}>` : previewEmail.from_email}</p>
                <p><strong>Para:</strong> {previewEmail.to_name ? `${previewEmail.to_name} <${previewEmail.to_email}>` : previewEmail.to_email}</p>
                <p><strong>Enviado em:</strong> {format(new Date(previewEmail.sent_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewEmail.body) }}
                />
              </ScrollArea>
              {previewEmail.status === 'failed' && previewEmail.error_message && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                  <strong>Erro:</strong> {previewEmail.error_message}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
