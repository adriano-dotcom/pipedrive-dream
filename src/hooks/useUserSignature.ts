import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserSignature {
  id: string;
  user_id: string;
  signature_html: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserSignature() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: signature, isLoading } = useQuery({
    queryKey: ['user-signature', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_signatures')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as UserSignature | null;
    },
    enabled: !!user?.id,
  });

  const upsertSignatureMutation = useMutation({
    mutationFn: async (signatureHtml: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if signature exists
      const { data: existing } = await supabase
        .from('user_signatures')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('user_signatures')
          .update({
            signature_html: signatureHtml,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('user_signatures')
          .insert({
            user_id: user.id,
            signature_html: signatureHtml,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success('Assinatura salva com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['user-signature', user?.id] });
    },
    onError: (error: Error) => {
      console.error('Error saving signature:', error);
      toast.error('Erro ao salvar assinatura');
    },
  });

  return {
    signature,
    isLoading,
    saveSignature: upsertSignatureMutation.mutateAsync,
    isSaving: upsertSignatureMutation.isPending,
  };
}
