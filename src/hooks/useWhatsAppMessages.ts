import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppMessage {
  id: string;
  timelines_message_id: string | null;
  conversation_id: string;
  sender_type: 'contact' | 'agent' | 'system';
  sender_id: string | null;
  content: string | null;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'sticker';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  media_url: string | null;
  media_mime_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profile?: {
    full_name: string;
  } | null;
}

export function useWhatsAppMessages(conversationId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          profile:sender_id (full_name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as WhatsAppMessage[];
    },
    enabled: !!conversationId,
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`whatsapp-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}
