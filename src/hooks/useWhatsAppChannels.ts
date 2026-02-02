import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppChannel {
  id: string;
  timelines_channel_id: string;
  name: string;
  phone_number: string | null;
  is_active: boolean | null;
  metadata: Record<string, unknown> | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  owner: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export function useWhatsAppChannels() {
  return useQuery({
    queryKey: ['whatsapp-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_channels')
        .select(`
          *,
          owner:profiles!whatsapp_channels_owner_id_fkey (id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as WhatsAppChannel[];
    },
  });
}

interface UpdateChannelData {
  name?: string;
  phone_number?: string;
  is_active?: boolean;
  owner_id?: string | null;
}

export function useUpdateWhatsAppChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, data }: { channelId: string; data: UpdateChannelData }) => {
      const { error } = await supabase
        .from('whatsapp_channels')
        .update(data)
        .eq('id', channelId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-channels'] });
      toast.success('Canal atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Error updating channel:', error);
      toast.error('Erro ao atualizar canal');
    },
  });
}

interface CreateChannelData {
  name: string;
  timelines_channel_id: string;
  phone_number?: string;
  is_active?: boolean;
  owner_id?: string | null;
}

export function useCreateWhatsAppChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateChannelData) => {
      const { error } = await supabase
        .from('whatsapp_channels')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-channels'] });
      toast.success('Canal criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating channel:', error);
      toast.error('Erro ao criar canal');
    },
  });
}

export function useDeleteWhatsAppChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase
        .from('whatsapp_channels')
        .delete()
        .eq('id', channelId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-channels'] });
      toast.success('Canal excluído com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting channel:', error);
      toast.error('Erro ao excluir canal');
    },
  });
}
