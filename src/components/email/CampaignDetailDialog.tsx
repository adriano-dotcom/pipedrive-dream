import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, CheckCircle, XCircle, MailOpen, Clock, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBulkEmail } from '@/hooks/useBulkEmail';

interface CampaignDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

const recipientStatusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-muted-foreground' },
  sent: { label: 'Enviado', icon: CheckCircle, color: 'text-emerald-500' },
  opened: { label: 'Aberto', icon: MailOpen, color: 'text-blue-500' },
  failed: { label: 'Falhou', icon: XCircle, color: 'text-destructive' },
  bounced: { label: 'Bounce', icon: XCircle, color: 'text-orange-500' },
  blocked: { label: 'Bloqueado', icon: Ban, color: 'text-destructive' },
};

export function CampaignDetailDialog({ open, onOpenChange, campaignId }: CampaignDetailDialogProps) {
  const { getCampaignRecipients } = useBulkEmail();
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && campaignId) {
      setLoading(true);
      getCampaignRecipients(campaignId)
        .then(setRecipients)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, campaignId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Destinatários da Campanha</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {recipients.map((r: any) => {
                const sc = recipientStatusConfig[r.status] || recipientStatusConfig.pending;
                const Icon = sc.icon;

                return (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{r.name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                      {r.error_message && (
                        <p className="text-xs text-destructive">{r.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {r.opened_at && (
                        <span className="text-xs text-muted-foreground">
                          Aberto {format(new Date(r.opened_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Icon className={`h-3 w-3 ${sc.color}`} />
                        {sc.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
