import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OrganizationHistory {
  id: string;
  organization_id: string;
  event_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  profile?: { full_name: string } | null;
}

export interface OrganizationNote {
  id: string;
  organization_id: string;
  content: string;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string } | null;
}

export interface OrganizationActivity {
  id: string;
  title: string;
  activity_type: string;
  due_date: string;
  due_time: string | null;
  is_completed: boolean;
  completed_at: string | null;
  priority: string | null;
  description: string | null;
}

export interface OrganizationDeal {
  id: string;
  title: string;
  value: number | null;
  status: string;
  stage: { name: string; color: string | null } | null;
  pipeline: { name: string } | null;
  created_at: string;
}

export interface OrganizationPerson {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  job_title: string | null;
  is_primary: boolean;
}

export function useOrganizationDetails(organizationId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch organization with related data
  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          primary_contact:people!primary_contact_id(
            id, name, email, phone, whatsapp, job_title
          )
        `)
        .eq('id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch people linked to this organization
  const { data: people = [] } = useQuery({
    queryKey: ['organization-people', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .select('id, name, email, phone, whatsapp, job_title')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      
      return data.map(p => ({
        ...p,
        is_primary: p.id === organization?.primary_contact_id,
      })) as OrganizationPerson[];
    },
    enabled: !!organizationId && !!organization,
  });

  // Fetch organization history
  const { data: history = [] } = useQuery({
    queryKey: ['organization-history', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_history')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for history entries
      const creatorIds = [...new Set(data.map(h => h.created_by).filter(Boolean))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', creatorIds as string[]);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(h => ({
          ...h,
          profile: h.created_by ? profileMap.get(h.created_by) : null,
        })) as OrganizationHistory[];
      }

      return data as OrganizationHistory[];
    },
    enabled: !!organizationId,
  });

  // Fetch organization notes
  const { data: notes = [] } = useQuery({
    queryKey: ['organization-notes', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_notes')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const creatorIds = [...new Set(data.map(n => n.created_by).filter(Boolean))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', creatorIds as string[]);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(n => ({
          ...n,
          is_pinned: n.is_pinned ?? false,
          profile: n.created_by ? profileMap.get(n.created_by) : null,
        })) as OrganizationNote[];
      }

      return data.map(n => ({ ...n, is_pinned: n.is_pinned ?? false })) as OrganizationNote[];
    },
    enabled: !!organizationId,
  });

  // Fetch activities linked to this organization
  const { data: activities = [] } = useQuery({
    queryKey: ['organization-activities', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, activity_type, due_date, due_time, is_completed, completed_at, priority, description')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as OrganizationActivity[];
    },
    enabled: !!organizationId,
  });

  // Fetch deals linked to this organization
  const { data: deals = [] } = useQuery({
    queryKey: ['organization-deals', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id, title, value, status, created_at,
          stage:stages(name, color),
          pipeline:pipelines(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrganizationDeal[];
    },
    enabled: !!organizationId,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('organization_notes').insert({
        organization_id: organizationId,
        content,
        created_by: user.id,
      });

      if (error) throw error;

      // Log to history
      await supabase.from('organization_history').insert({
        organization_id: organizationId,
        event_type: 'note_added',
        description: 'Nova nota adicionada',
        created_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-notes', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-history', organizationId] });
      toast.success('Nota adicionada!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar nota: ' + error.message);
    },
  });

  // Toggle pin mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('organization_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-notes', organizationId] });
    },
    onError: (error) => {
      toast.error('Erro ao fixar nota: ' + error.message);
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('organization_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-notes', organizationId] });
      toast.success('Nota excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir nota: ' + error.message);
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      const { error } = await supabase
        .from('organization_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-notes', organizationId] });
      toast.success('Nota atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar nota: ' + error.message);
    },
  });

  return {
    organization,
    people,
    history,
    notes,
    activities,
    deals,
    isLoading,
    addNote: addNoteMutation.mutate,
    isAddingNote: addNoteMutation.isPending,
    togglePin: (noteId: string, isPinned: boolean) => togglePinMutation.mutate({ noteId, isPinned }),
    deleteNote: deleteNoteMutation.mutate,
    updateNote: (noteId: string, content: string) => updateNoteMutation.mutate({ noteId, content }),
    isUpdatingNote: updateNoteMutation.isPending,
  };
}
