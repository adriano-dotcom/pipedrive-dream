import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, CheckCircle2, Clock, ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';

interface ConversationPickerProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
}

export function ConversationPicker({ 
  conversations, 
  selectedId, 
  onSelect 
}: ConversationPickerProps) {
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-amber-500" />;
      case 'in_progress':
        return <ArrowUpCircle className="h-3 w-3 text-emerald-500" />;
      case 'resolved':
        return <CheckCircle2 className="h-3 w-3 text-muted-foreground" />;
      default:
        return <Clock className="h-3 w-3 text-amber-500" />;
    }
  };

  return (
    <div className="border-b">
      <ScrollArea className="max-h-[120px]">
        <div className="flex gap-2 p-3 overflow-x-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors whitespace-nowrap',
                selectedId === conv.id
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-muted/50 border-transparent hover:bg-muted'
              )}
            >
              <MessageCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium">
                {conv.whatsapp_channels?.name || 'WhatsApp'}
              </span>
              {getStatusIcon(conv.status)}
              {conv.last_message_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(conv.last_message_at), "d MMM", { locale: ptBR })}
                </span>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
