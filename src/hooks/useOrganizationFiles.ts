import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OrganizationFile {
  id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string | null;
  created_at: string;
  profile?: { full_name: string } | null;
}

export function useOrganizationFiles(organizationId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch organization files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['organization-files', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_files')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for files
      const uploaderIds = [...new Set(data.map(f => f.uploaded_by).filter(Boolean))];
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', uploaderIds as string[]);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(f => ({
          ...f,
          profile: f.uploaded_by ? profileMap.get(f.uploaded_by) : null,
        })) as OrganizationFile[];
      }

      return data as OrganizationFile[];
    },
    enabled: !!organizationId,
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const filePath = `${organizationId}/${user.id}/${Date.now()}_${file.name}`;

      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('organization-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Save metadata
      const { error: metaError } = await supabase.from('organization_files').insert({
        organization_id: organizationId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      });

      if (metaError) {
        // Rollback storage upload if metadata fails
        await supabase.storage.from('organization-files').remove([filePath]);
        throw metaError;
      }

      // 3. Log to history
      await supabase.from('organization_history').insert({
        organization_id: organizationId,
        event_type: 'file_uploaded',
        description: `Arquivo enviado: ${file.name}`,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-files', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-history', organizationId] });
      toast.success('Arquivo enviado com sucesso');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivo');
    },
  });

  // Download file
  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('organization-files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (file: OrganizationFile) => {
      // 1. Delete from storage
      const { error: storageError } = await supabase.storage
        .from('organization-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // 2. Delete metadata
      const { error: metaError } = await supabase
        .from('organization_files')
        .delete()
        .eq('id', file.id);

      if (metaError) throw metaError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-files', organizationId] });
      toast.success('Arquivo excluído');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Erro ao excluir arquivo');
    },
  });

  return {
    files,
    isLoading,
    uploadFile: uploadFileMutation.mutate,
    isUploading: uploadFileMutation.isPending,
    downloadFile,
    deleteFile: deleteFileMutation.mutate,
    isDeleting: deleteFileMutation.isPending,
  };
}
