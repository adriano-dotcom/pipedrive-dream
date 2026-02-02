import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageCircle, 
  CheckCircle2, 
  Sparkles, 
  Loader2,
  Clock,
  ArrowUpCircle,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';

interface ChatHeaderProps {
  conversation: WhatsAppConversation;
  onResolve: () => void;
  onAnalyze: () => void;
  isResolving: boolean;
  isAnalyzing: boolean;
}

export function ChatHeader({ 
  conversation, 
  onResolve, 
  onAnalyze,
  isResolving,
  isAnalyzing 
}: ChatHeaderProps) {
  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case 'pending':
        return { 
          label: 'Aguardando', 
          icon: Clock, 
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
        };
      case 'in_progress':
        return { 
          label: 'Em atendimento', 
          icon: ArrowUpCircle, 
          className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
        };
      case 'resolved':
        return { 
          label: 'Resolvido', 
          icon: CheckCircle2, 
          className: 'bg-muted text-muted-foreground' 
        };
      case 'archived':
        return { 
          label: 'Arquivado', 
          icon: Archive, 
          className: 'bg-muted text-muted-foreground' 
        };
      default:
        return { 
          label: 'Aguardando', 
          icon: Clock, 
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
        };
    }
  };

  const statusConfig = getStatusConfig(conversation.status);
  const StatusIcon = statusConfig.icon;
  const isResolved = conversation.status === 'resolved' || conversation.status === 'archived';

  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-muted/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shrink-0">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">WhatsApp</span>
            {conversation.whatsapp_channels?.name && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground truncate">
                  {conversation.whatsapp_channels.name}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <Badge variant="secondary" className={statusConfig.className}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
            {conversation.last_message_at && (
              <span className="text-xs text-muted-foreground">
                Última mensagem: {format(new Date(conversation.last_message_at), "d MMM 'às' HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="gap-1.5"
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Analisar IA</span>
        </Button>
        
        {!isResolved && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResolve}
            disabled={isResolving}
            className="gap-1.5"
          >
            {isResolving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Resolver</span>
          </Button>
        )}
      </div>
    </div>
  );
}
