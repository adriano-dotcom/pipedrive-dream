import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { AnalysisCard } from './AnalysisCard';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useSendWhatsAppMessage } from '@/hooks/useSendWhatsAppMessage';
import { useUpdateWhatsAppConversation } from '@/hooks/useUpdateWhatsAppConversation';
import { useWhatsAppAnalysis, useAnalyzeWhatsAppConversation } from '@/hooks/useWhatsAppAnalysis';
import type { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';

interface ChatPanelProps {
  conversation: WhatsAppConversation;
  personId: string;
}

export function ChatPanel({ conversation, personId }: ChatPanelProps) {
  const { data: messages = [], isLoading: isLoadingMessages } = useWhatsAppMessages(conversation.id);
  const { mutate: sendMessage, isPending: isSending } = useSendWhatsAppMessage();
  const { mutate: updateConversation, isPending: isUpdating } = useUpdateWhatsAppConversation();
  const { mutate: analyzeConversation, isPending: isAnalyzing } = useAnalyzeWhatsAppConversation();
  // Fetch existing analysis
  const { data: analysis, refetch: refetchAnalysis } = useWhatsAppAnalysis(conversation.id);

  const handleSend = (content: string) => {
    sendMessage({ 
      conversationId: conversation.id, 
      content 
    });
  };

  const handleResolve = () => {
    updateConversation({
      conversationId: conversation.id,
      personId,
      data: {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      },
    });
  };

  const handleAnalyze = () => {
    analyzeConversation(conversation.id, {
      onSuccess: () => {
        refetchAnalysis();
      },
    });
  };

  const isResolved = conversation.status === 'resolved' || conversation.status === 'archived';

  return (
    <div className="flex flex-col h-[600px] border rounded-xl bg-card overflow-hidden">
      <ChatHeader
        conversation={conversation}
        onResolve={handleResolve}
        onAnalyze={handleAnalyze}
        isResolving={isUpdating}
        isAnalyzing={isAnalyzing}
      />

      <MessageList 
        messages={messages} 
        isLoading={isLoadingMessages} 
      />

      <ChatInput
        onSend={handleSend}
        isSending={isSending}
        disabled={isResolved}
        placeholder={isResolved ? 'Conversa resolvida' : 'Digite sua mensagem...'}
      />

      {/* Analysis card at the bottom if exists */}
      {analysis && (
        <div className="p-4 border-t">
          <AnalysisCard analysis={analysis} />
        </div>
      )}
    </div>
  );
}
