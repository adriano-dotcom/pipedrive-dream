import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Vendedor {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  role: 'admin' | 'corretor';
  is_active: boolean;
}

export function useVendedores() {
  return useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, phone, avatar_url, created_at, is_active')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      return (profiles || []).map(profile => ({
        ...profile,
        role: (roles?.find(r => r.user_id === profile.user_id)?.role || 'corretor') as 'admin' | 'corretor'
      })) as Vendedor[];
    }
  });
}

export function useUpdateVendedorRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'corretor' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      toast.success('Role atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar role. Apenas admins podem fazer isso.');
    }
  });
}

export function useUpdateVendedorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, fullName, phone }: { userId: string; fullName: string; phone: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil.');
    }
  });
}

export function useToggleVendedorActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      toast.success(isActive ? 'Vendedor reativado!' : 'Vendedor inativado!');
    },
    onError: (error) => {
      console.error('Error toggling active:', error);
      toast.error('Erro ao alterar status do vendedor.');
    }
  });
}

export function useDeleteVendedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userIdToDelete: userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      toast.success('Usuário excluído do sistema!');
    },
    onError: (error) => {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erro ao excluir usuário.');
    }
  });
}
