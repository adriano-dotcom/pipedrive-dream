import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Copy, Check, MessageSquare, Info, Loader2 } from 'lucide-react';
import { ChannelTable } from '@/components/timelines/ChannelTable';
import { ChannelFormSheet } from '@/components/timelines/ChannelFormSheet';
import { useWhatsAppChannels, WhatsAppChannel } from '@/hooks/useWhatsAppChannels';
import { toast } from 'sonner';

const WEBHOOK_URL = `https://yqidjdpxkzgrhneaxngn.supabase.co/functions/v1/timelines-webhook`;

export default function TimelinesAdmin() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: channels = [], isLoading: channelsLoading } = useWhatsAppChannels();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<WhatsAppChannel | null>(null);
  const [copied, setCopied] = useState(false);

  // Aguardar carregamento da autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirecionar se não for admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleAddChannel = () => {
    setSelectedChannel(null);
    setSheetOpen(true);
  };

  const handleEditChannel = (channel: WhatsAppChannel) => {
    setSelectedChannel(channel);
    setSheetOpen(true);
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      setCopied(true);
      toast.success('URL copiada para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar URL');
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-emerald-500" />
              Timelines.ai - Administração
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os canais WhatsApp conectados ao sistema
            </p>
          </div>
          <Button onClick={handleAddChannel}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Canal Manual
          </Button>
        </div>

        {/* Channels Table */}
        <Card>
          <CardHeader>
            <CardTitle>Canais WhatsApp</CardTitle>
            <CardDescription>
              {channels.length} {channels.length === 1 ? 'canal conectado' : 'canais conectados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {channelsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <ChannelTable channels={channels} onEdit={handleEditChannel} />
            )}
          </CardContent>
        </Card>

        {/* Webhook Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Configuração do Webhook
            </CardTitle>
            <CardDescription>
              Configure esta URL no Timelines.ai para sincronizar mensagens automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={WEBHOOK_URL} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={handleCopyWebhook}>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Como configurar:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Acesse o painel do Timelines.ai</li>
                <li>Vá em Configurações → Webhooks</li>
                <li>Cole a URL acima no campo de webhook</li>
                <li>Selecione os eventos: mensagens recebidas e enviadas</li>
                <li>Salve as configurações</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChannelFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        channel={selectedChannel}
      />
    </>
  );
}
