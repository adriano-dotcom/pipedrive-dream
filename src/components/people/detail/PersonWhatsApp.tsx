import { useState, useEffect } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { ChatPanel } from '@/components/whatsapp/ChatPanel';
import { ConversationPicker } from '@/components/whatsapp/ConversationPicker';
import { usePersonWhatsAppConversations } from '@/hooks/useWhatsAppConversations';

interface PersonWhatsAppProps {
  personId: string;
}

export function PersonWhatsApp({ personId }: PersonWhatsAppProps) {
  const { data: conversations = [], isLoading } = usePersonWhatsAppConversations(personId);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Auto-select first conversation when data loads
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
          <MessageCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium mb-2">Nenhuma conversa WhatsApp</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          As conversas aparecerão aqui automaticamente quando o contato enviar uma mensagem pelo WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Conversation picker if multiple conversations */}
      {conversations.length > 1 && (
        <ConversationPicker
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
        />
      )}

      {/* Chat panel */}
      {selectedConversation && (
        <ChatPanel 
          conversation={selectedConversation} 
          personId={personId}
        />
      )}
    </div>
  );
}
