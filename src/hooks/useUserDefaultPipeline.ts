import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useUserDefaultPipeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userDefaultPipelineId, isLoading } = useQuery({
    queryKey: ['user-default-pipeline', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('default_pipeline_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user default pipeline:', error);
        return null;
      }
      
      return data?.default_pipeline_id || null;
    },
    enabled: !!user?.id,
  });

  const setDefaultPipelineMutation = useMutation({
    mutationFn: async (pipelineId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ default_pipeline_id: pipelineId })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-default-pipeline'] });
      toast({
        title: 'Funil padrão definido',
        description: 'Este funil será selecionado automaticamente ao abrir a página.',
      });
    },
    onError: (error) => {
      console.error('Error setting default pipeline:', error);
      toast({
        title: 'Erro ao definir funil padrão',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    userDefaultPipelineId,
    isLoading,
    setDefaultPipeline: setDefaultPipelineMutation.mutate,
    isSettingDefault: setDefaultPipelineMutation.isPending,
  };
}
