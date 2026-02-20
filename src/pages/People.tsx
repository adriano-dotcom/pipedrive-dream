import { useState, useMemo, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, Users, Loader2, Sparkles, Mail } from 'lucide-react';
import { ImportButton } from '@/components/import/ImportButton';
import { toast } from 'sonner';
import { PersonForm } from '@/components/people/PersonForm';
import { PeopleTable } from '@/components/people/PeopleTable';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { TagFilterPopover } from '@/components/shared/TagFilterPopover';
import { usePersonTags } from '@/hooks/usePersonTags';
import { MergeContactsDialog } from '@/components/people/MergeContactsDialog';
import { PeopleFilters, PeopleFiltersState, defaultPeopleFilters } from '@/components/people/PeopleFilters';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { BulkEmailComposerDialog } from '@/components/email/BulkEmailComposerDialog';
import { BulkEmailCampaignsList } from '@/components/email/BulkEmailCampaignsList';
import { SaveToCampaignDialog } from '@/components/email/SaveToCampaignDialog';
import { applyPeopleFilters, type PeopleFilterParams } from '@/services/filterBuilder';
import { getErrorMessage } from '@/services/supabaseErrors';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface PersonWithOrg extends Person {
  organizations?: {
    id: string;
    name: string;
    cnpj: string | null;
    address_city: string | null;
    address_state: string | null;
    automotores: number | null;
  } | null;
  owner?: {
    id: string;
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface EmailRecipient {
  id?: string;
  person_id?: string;
  name: string;
  email: string | null;
  email_status?: string | null;
  organization_name: string | null;
  organization_city: string | null;
  job_title: string | null;
}

const STORAGE_KEY = 'people-advanced-filters';
const PAGE_SIZE_KEY = 'people-table-page-size';

export default function People() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonWithOrg | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonWithOrg | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkEmailRecipients, setBulkEmailRecipients] = useState<EmailRecipient[]>([]);
  const [isLoadingFilteredRecipients, setIsLoadingFilteredRecipients] = useState(false);
  const [saveToCampaignOpen, setSaveToCampaignOpen] = useState(false);
  const [saveToCampaignRecipients, setSaveToCampaignRecipients] = useState<EmailRecipient[]>([]);
  const [campaignsOpen, setCampaignsOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('people-tag-filter');
    return saved ? JSON.parse(saved) : [];
  });

  const [advancedFilters, setAdvancedFilters] = useState<PeopleFiltersState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultPeopleFilters,
          ...parsed,
          dateRange: {
            from: parsed.dateRange?.from ? new Date(parsed.dateRange.from) : null,
            to: parsed.dateRange?.to ? new Date(parsed.dateRange.to) : null,
          },
        };
      }
    } catch (e) {
      console.error('Error loading filters from localStorage:', e);
    }
    return defaultPeopleFilters;
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(advancedFilters));
  }, [advancedFilters]);

  useEffect(() => {
    localStorage.setItem('people-tag-filter', JSON.stringify(selectedTagIds));
  }, [selectedTagIds]);

  const { data: personTags = [], isLoading: tagsLoading } = usePersonTags();

  const { data: taggedPersonIds = [], isFetched: tagQueryFetched } = useQuery({
    queryKey: ['person-tag-filter-assignments', selectedTagIds],
    queryFn: async () => {
      if (selectedTagIds.length === 0) return [];
      const { data, error } = await supabase
        .from('person_tag_assignments')
        .select('person_id')
        .in('tag_id', selectedTagIds);
      if (error) throw error;
      return data?.map((a) => a.person_id) || [];
    },
    enabled: selectedTagIds.length > 0,
  });

  /** Parâmetros de filtro compartilhados entre todas as queries */
  const filterParams: PeopleFilterParams = useMemo(() => ({
    search: debouncedSearch,
    labels: advancedFilters.labels,
    leadSources: advancedFilters.leadSources,
    jobTitles: advancedFilters.jobTitles,
    organizationId: advancedFilters.organizationId,
    cities: advancedFilters.cities,
    ownerId: advancedFilters.ownerId,
    dateRange: advancedFilters.dateRange,
    hasEmail: advancedFilters.hasEmail,
    hasPhone: advancedFilters.hasPhone,
    selectedTagIds,
    taggedPersonIds,
  }), [debouncedSearch, advancedFilters, selectedTagIds, taggedPersonIds]);

  const fetchPeople = useCallback(async ({ from, to }: { from: number; to: number }) => {
    const baseQuery = supabase
      .from('people')
      .select(`
        *,
        organizations:organizations!people_organization_id_fkey(id, name, cnpj, address_city, address_state, automotores)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    const { query, empty } = await applyPeopleFilters(baseQuery, filterParams);
    if (empty) return { data: [], count: 0 };

    const { data, error, count } = await (query as any).range(from, to);
    if (error) throw error;

    return { data: data as PersonWithOrg[], count };
  }, [filterParams]);

  const isTagQueryReady = selectedTagIds.length === 0 || tagQueryFetched;

  const {
    data: people,
    totalCount,
    pageCount,
    currentPage,
    pageSize,
    isLoading,
    isFetching,
    goToPage,
    setPageSize,
  } = usePaginatedQuery<PersonWithOrg>({
    queryKey: ['people', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(selectedTagIds)],
    queryFn: fetchPeople,
    pageSizeStorageKey: PAGE_SIZE_KEY,
    pageSize: 25,
    enabled: isTagQueryReady,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('people').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Pessoa excluída com sucesso!');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('people').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(`${selectedIds.length} pessoa(s) excluída(s) com sucesso!`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleEdit = (person: PersonWithOrg) => {
    setEditingPerson(person);
    setIsDialogOpen(true);
  };

  const handleDelete = (person: PersonWithOrg) => {
    setDeleteTarget(person);
  };

  const confirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPerson(null);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      debouncedSearch.length > 0 ||
      selectedTagIds.length > 0 ||
      advancedFilters.labels.length > 0 ||
      advancedFilters.leadSources.length > 0 ||
      advancedFilters.jobTitles.length > 0 ||
      advancedFilters.cities.length > 0 ||
      advancedFilters.organizationId !== null ||
      advancedFilters.ownerId !== null ||
      advancedFilters.dateRange.from !== null ||
      advancedFilters.dateRange.to !== null ||
      advancedFilters.hasEmail !== null ||
      advancedFilters.hasPhone !== null
    );
  }, [debouncedSearch, selectedTagIds, advancedFilters]);

  /** Busca todos os recipients filtrados (sem paginação) — reutiliza filterBuilder */
  const fetchAllFilteredRecipients = async () => {
    setIsLoadingFilteredRecipients(true);
    try {
      const baseQuery = supabase
        .from('people')
        .select('id, name, email, email_status, job_title, organization_id, organizations:organizations!people_organization_id_fkey(name, address_city)')
        .order('name');

      const { query, empty } = await applyPeopleFilters(baseQuery, filterParams);
      if (empty) {
        setBulkEmailRecipients([]);
        setBulkEmailOpen(true);
        return;
      }

      const { data } = await (query as any);
      const recipients: EmailRecipient[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        email_status: p.email_status,
        organization_name: p.organizations?.name || null,
        organization_city: p.organizations?.address_city || null,
        job_title: p.job_title || null,
      }));
      setBulkEmailRecipients(recipients);
      setBulkEmailOpen(true);
    } catch (error) {
      toast.error('Erro ao buscar contatos filtrados');
    } finally {
      setIsLoadingFilteredRecipients(false);
    }
  };

  const handleBulkEmailSelected = () => {
    const recipients: EmailRecipient[] = people.filter(p => selectedIds.includes(p.id)).map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      email_status: (p as any).email_status,
      organization_name: p.organizations?.name || null,
      organization_city: p.organizations?.address_city || null,
      job_title: p.job_title || null,
    }));
    setBulkEmailRecipients(recipients);
    setBulkEmailOpen(true);
  };

  const handleSaveToCampaignSelected = () => {
    const recipients: EmailRecipient[] = people.filter(p => selectedIds.includes(p.id))
      .filter(p => p.email)
      .map(p => ({
        person_id: p.id,
        email: p.email!,
        name: p.name,
        organization_name: p.organizations?.name || null,
        organization_city: p.organizations?.address_city || null,
        job_title: p.job_title || null,
      }));
    setSaveToCampaignRecipients(recipients);
    setSaveToCampaignOpen(true);
  };

  const handleSaveToCampaignAll = async () => {
    setIsLoadingFilteredRecipients(true);
    try {
      const baseQuery = supabase
        .from('people')
        .select('id, name, email, email_status, job_title, organization_id, organizations:organizations!people_organization_id_fkey(name, address_city)')
        .not('email', 'is', null)
        .order('name');

      const { query, empty } = await applyPeopleFilters(baseQuery, filterParams);
      if (empty) {
        setSaveToCampaignRecipients([]);
        setSaveToCampaignOpen(true);
        return;
      }

      const { data } = await (query as any);
      const recipients: EmailRecipient[] = (data || []).map((p: any) => ({
        person_id: p.id,
        email: p.email!,
        name: p.name,
        organization_name: p.organizations?.name || null,
        organization_city: p.organizations?.address_city || null,
        job_title: p.job_title || null,
      }));
      setSaveToCampaignRecipients(recipients);
      setSaveToCampaignOpen(true);
    } catch (error) {
      toast.error('Erro ao buscar contatos filtrados');
    } finally {
      setIsLoadingFilteredRecipients(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Pessoas
              {!isLoading && totalCount > 0 && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  ({totalCount.toLocaleString('pt-BR')})
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              Gerencie contatos individuais e leads
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCampaignsOpen(true)} className="gap-2">
            <Mail className="h-4 w-4" />
            Campanhas
          </Button>
          <ImportButton defaultType="people" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPerson(null)} className="shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" />
                Nova Pessoa
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto glass border-border/50">
            <DialogHeader>
              <DialogTitle>
                {editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'}
              </DialogTitle>
            </DialogHeader>
            <PersonForm
              person={editingPerson}
              onSuccess={handleCloseDialog}
              onCancel={handleCloseDialog}
            />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Tag Filter & Advanced Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/50"
            />
          </div>
          <TagFilterPopover
            tags={personTags}
            isLoading={tagsLoading}
            selectedTagIds={selectedTagIds}
            onTagsChange={setSelectedTagIds}
            placeholder="Etiquetas"
            emptyMessage="Nenhuma etiqueta criada"
          />
          <PeopleFilters
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            people={people || []}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Loader2 className="h-8 w-8 animate-spin text-primary relative" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">Carregando pessoas...</p>
        </div>
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-2xl bg-muted/50 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-1">Nenhuma pessoa encontrada</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {hasActiveFilters ? 'Tente ajustar sua busca ou filtros' : 'Adicione seu primeiro contato para começar'}
          </p>
          {!hasActiveFilters && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Criar Primeiro Contato
            </Button>
          )}
        </div>
      ) : (
        <PeopleTable
          people={people}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={() => setBulkDeleteOpen(true)}
          onMerge={() => setMergeDialogOpen(true)}
          onBulkEmail={handleBulkEmailSelected}
          onBulkEmailAll={fetchAllFilteredRecipients}
          onSaveToCampaign={handleSaveToCampaignSelected}
          onSaveToCampaignAll={handleSaveToCampaignAll}
          hasActiveFilters={hasActiveFilters}
          isLoadingFilteredRecipients={isLoadingFilteredRecipients}
          totalCount={totalCount}
          pageCount={pageCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
          isFetching={isFetching}
        />
      )}

      {/* Merge Contacts Dialog */}
      {selectedIds.length === 2 && (
        <MergeContactsDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          person1={people.find(p => p.id === selectedIds[0])!}
          person2={people.find(p => p.id === selectedIds[1])!}
          onSuccess={() => {
            setSelectedIds([]);
            setMergeDialogOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Pessoa"
        itemName={deleteTarget?.name}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Excluir Pessoas"
        itemCount={selectedIds.length}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        isDeleting={bulkDeleteMutation.isPending}
      />

      {/* Bulk Email Dialog */}
      <BulkEmailComposerDialog
        open={bulkEmailOpen}
        onOpenChange={setBulkEmailOpen}
        recipients={bulkEmailRecipients}
        onSuccess={() => setSelectedIds([])}
      />

      {/* Campaigns List */}
      <BulkEmailCampaignsList
        open={campaignsOpen}
        onOpenChange={setCampaignsOpen}
      />

      {/* Save to Campaign Dialog */}
      <SaveToCampaignDialog
        open={saveToCampaignOpen}
        onOpenChange={setSaveToCampaignOpen}
        recipients={saveToCampaignRecipients}
        onSuccess={() => setSelectedIds([])}
      />
    </div>
  );
}
