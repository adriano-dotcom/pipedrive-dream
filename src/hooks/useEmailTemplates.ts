import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  category: string;
  created_by: string | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateTemplateParams {
  name: string;
  subject?: string;
  body: string;
  category?: string;
  is_global?: boolean;
}

export function useEmailTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!user,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (params: CreateTemplateParams) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          name: params.name,
          subject: params.subject || null,
          body: params.body,
          category: params.category || 'general',
          is_global: params.is_global || false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Template criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (error: Error) => {
      console.error('Error creating template:', error);
      toast.error('Erro ao criar template');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...params }: CreateTemplateParams & { id: string }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update({
          name: params.name,
          subject: params.subject || null,
          body: params.body,
          category: params.category,
          is_global: params.is_global,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Template atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (error: Error) => {
      console.error('Error updating template:', error);
      toast.error('Erro ao atualizar template');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (error: Error) => {
      console.error('Error deleting template:', error);
      toast.error('Erro ao excluir template');
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
  };
}
