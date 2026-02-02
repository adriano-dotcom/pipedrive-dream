import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppConversation {
  id: string;
  timelines_conversation_id: string | null;
  channel_id: string;
  person_id: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'archived';
  assigned_to: string | null;
  priority: number;
  tags: string[];
  last_message_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  people?: {
    id: string;
    name: string;
    whatsapp: string | null;
    email: string | null;
  } | null;
  whatsapp_channels?: {
    id: string;
    name: string;
    phone_number: string | null;
  } | null;
}

interface UseWhatsAppConversationsOptions {
  status?: 'pending' | 'in_progress' | 'resolved' | 'archived' | 'all';
  assignedTo?: string;
  channelId?: string;
  personId?: string;
  search?: string;
}

export function useWhatsAppConversations(options: UseWhatsAppConversationsOptions = {}) {
  const { status = 'all', assignedTo, channelId, personId, search } = options;

  return useQuery({
    queryKey: ['whatsapp-conversations', options],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          people:person_id (id, name, whatsapp, email),
          whatsapp_channels:channel_id (id, name, phone_number)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo);
      }

      if (channelId) {
        query = query.eq('channel_id', channelId);
      }

      if (personId) {
        query = query.eq('person_id', personId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtrar por busca no lado do cliente se necessário
      let filtered = data as WhatsAppConversation[];
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(conv => 
          conv.people?.name?.toLowerCase().includes(searchLower) ||
          conv.people?.whatsapp?.includes(search)
        );
      }

      return filtered;
    },
  });
}

export function useWhatsAppConversation(conversationId: string) {
  return useQuery({
    queryKey: ['whatsapp-conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          people:person_id (id, name, whatsapp, email, phone, job_title),
          whatsapp_channels:channel_id (id, name, phone_number)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data as WhatsAppConversation;
    },
    enabled: !!conversationId,
  });
}

export function usePersonWhatsAppConversations(personId: string) {
  return useQuery({
    queryKey: ['whatsapp-conversations', 'person', personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_channels:channel_id (id, name, phone_number)
        `)
        .eq('person_id', personId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as WhatsAppConversation[];
    },
    enabled: !!personId,
  });
}
