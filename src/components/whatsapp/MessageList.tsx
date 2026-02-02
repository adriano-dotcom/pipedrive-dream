import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import type { WhatsAppMessage } from '@/hooks/useWhatsAppMessages';

interface MessageListProps {
  messages: WhatsAppMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView();
  }, []);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "d 'de' MMMM", { locale: ptBR });
  };

  const shouldShowDateHeader = (message: WhatsAppMessage, index: number) => {
    if (index === 0) return true;
    const prevMessage = messages[index - 1];
    return !isSameDay(new Date(message.created_at), new Date(prevMessage.created_at));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-6">
        <div>
          <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            As mensagens aparecerão aqui
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="py-4 space-y-3">
        {messages.map((message, index) => (
          <div key={message.id}>
            {/* Date header */}
            {shouldShowDateHeader(message, index) && (
              <div className="flex justify-center py-3">
                <span className="text-xs bg-muted/70 text-muted-foreground px-3 py-1 rounded-full">
                  {formatDateHeader(message.created_at)}
                </span>
              </div>
            )}
            
            <MessageBubble message={message} />
          </div>
        ))}
        
        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
