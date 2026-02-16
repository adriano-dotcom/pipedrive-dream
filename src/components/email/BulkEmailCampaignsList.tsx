import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Eye, Loader2, CheckCircle, XCircle, Clock, MailOpen, RefreshCw, Send, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBulkEmail } from '@/hooks/useBulkEmail';
import { CampaignDetailDialog } from './CampaignDetailDialog';
import { CampaignComposerDialog } from './CampaignComposerDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';

interface BulkEmailCampaignsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  draft: { label: 'Rascunho', variant: 'outline', icon: Clock },
  queued: { label: 'Na fila', variant: 'secondary', icon: Clock },
  processing: { label: 'Enviando', variant: 'default', icon: Loader2 },
  completed: { label: 'Concluída', variant: 'default', icon: CheckCircle },
  paused: { label: 'Pausada', variant: 'outline', icon: Clock },
};

export function BulkEmailCampaignsList({ open, onOpenChange }: BulkEmailCampaignsListProps) {
  const { campaigns, campaignsLoading, continueProcessing, isContinuing, deleteCampaign, isDeletingCampaign } = useBulkEmail();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [composingCampaign, setComposingCampaign] = useState<{ id: string; name: string } | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deletingCampaignId) return;
    await deleteCampaign(deletingCampaignId);
    setDeletingCampaignId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Campanhas de E-mail
            </DialogTitle>
          </DialogHeader>

          {campaignsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma campanha criada ainda.
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {campaigns.map((campaign: any) => {
                  const sc = statusConfig[campaign.status] || statusConfig.draft;
                  const Icon = sc.icon;
                  const isDraft = campaign.status === 'draft';
                  const progress = campaign.total_recipients > 0
                    ? ((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100
                    : 0;
                  const openRate = campaign.sent_count > 0
                    ? Math.round((campaign.opened_count / campaign.sent_count) * 100)
                    : 0;

                  return (
                    <div key={campaign.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">{campaign.subject}</h4>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant={sc.variant} className="gap-1">
                          <Icon className={`h-3 w-3 ${campaign.status === 'processing' ? 'animate-spin' : ''}`} />
                          {sc.label}
                        </Badge>
                      </div>

                      {!isDraft && <Progress value={progress} className="h-2" />}

                      {!isDraft && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                            {campaign.sent_count} enviados
                          </span>
                          <span className="flex items-center gap-1">
                            <MailOpen className="h-3 w-3 text-blue-500" />
                            {campaign.opened_count} abertos ({openRate}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-destructive" />
                            {campaign.failed_count} falhas
                          </span>
                          <span>Total: {campaign.total_recipients}</span>
                        </div>
                      )}

                      {isDraft && (
                        <p className="text-xs text-muted-foreground">
                          {campaign.total_recipients} destinatário(s) • Aguardando envio
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        {isDraft ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setComposingCampaign({ id: campaign.id, name: campaign.subject })}
                            >
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Enviar E-mail
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCampaignId(campaign.id)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Destinatários
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingCampaignId(campaign.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Excluir
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setSelectedCampaignId(campaign.id)}>
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Detalhes
                            </Button>
                            {campaign.status === 'processing' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => continueProcessing(campaign.id)}
                                disabled={isContinuing}
                              >
                                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isContinuing ? 'animate-spin' : ''}`} />
                                Continuar envio
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {selectedCampaignId && (
        <CampaignDetailDialog
          open={!!selectedCampaignId}
          onOpenChange={(open) => !open && setSelectedCampaignId(null)}
          campaignId={selectedCampaignId}
        />
      )}

      {composingCampaign && (
        <CampaignComposerDialog
          open={!!composingCampaign}
          onOpenChange={(open) => !open && setComposingCampaign(null)}
          campaignId={composingCampaign.id}
          campaignName={composingCampaign.name}
          onSuccess={() => setComposingCampaign(null)}
        />
      )}

      <DeleteConfirmDialog
        open={!!deletingCampaignId}
        onOpenChange={(open) => !open && setDeletingCampaignId(null)}
        title="Excluir Campanha"
        itemName="esta campanha"
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeletingCampaign}
      />
    </>
  );
}
