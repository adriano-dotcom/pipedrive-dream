import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealsTable } from './DealsTable';
import { DealFormSheet } from './DealFormSheet';
import { KanbanFilters, KanbanFiltersState } from './KanbanFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
  probability: number;
}

interface DealsListViewProps {
  pipelineId: string | null;
  stages: Stage[];
}

const PAGE_SIZE_KEY = 'deals-list-page-size';

export function DealsListView({ pipelineId, stages }: DealsListViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [filters, setFilters] = useState<KanbanFiltersState>(() => {
    const saved = localStorage.getItem('kanban-filters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          dateRange: {
            from: parsed.dateRange?.from ? new Date(parsed.dateRange.from) : null,
            to: parsed.dateRange?.to ? new Date(parsed.dateRange.to) : null,
          },
          tagIds: parsed.tagIds || [],
        };
      } catch {
        return { insuranceTypes: [], labels: [], dateRange: { from: null, to: null }, ownerId: null, tagIds: [] };
      }
    }
    return { insuranceTypes: [], labels: [], dateRange: { from: null, to: null }, ownerId: null, tagIds: [] };
  });

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('kanban-filters', JSON.stringify(filters));
  }, [filters]);

  // Fetch profiles for owner display
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, user_id')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch deal tag assignments for filtering (when tags are selected)
  const { data: taggedDealIds = [] } = useQuery({
    queryKey: ['deal-tag-filter-assignments-list', filters.tagIds],
    queryFn: async () => {
      if (!filters.tagIds || filters.tagIds.length === 0) return [];
      const { data, error } = await supabase
        .from('deal_tag_assignments')
        .select('deal_id')
        .in('tag_id', filters.tagIds);
      if (error) throw error;
      return data?.map((a) => a.deal_id) || [];
    },
    enabled: (filters.tagIds?.length || 0) > 0,
  });

  // Build query function for server-side pagination
  const fetchDeals = async ({ from, to }: { from: number; to: number }) => {
    if (!pipelineId) {
      return { data: [], count: 0 };
    }

    let query = supabase
      .from('deals')
      .select(`
        *,
        organization:organizations(id, name),
        person:people(id, name),
        stage:stages(id, name, color)
      `, { count: 'exact' })
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: false });

    // Insurance type filter (server-side)
    if (filters.insuranceTypes.length > 0) {
      query = query.in('insurance_type', filters.insuranceTypes);
    }

    // Label filter (server-side)
    if (filters.labels.length > 0) {
      query = query.in('label', filters.labels);
    }

    // Date range filter on expected_close_date (server-side)
    if (filters.dateRange.from) {
      query = query.gte('expected_close_date', filters.dateRange.from.toISOString().split('T')[0]);
    }
    if (filters.dateRange.to) {
      query = query.lte('expected_close_date', filters.dateRange.to.toISOString().split('T')[0]);
    }

    // Owner filter (server-side)
    if (filters.ownerId) {
      query = query.eq('owner_id', filters.ownerId);
    }

    // Tag filter - filter by IDs if tags selected
    if ((filters.tagIds?.length || 0) > 0 && taggedDealIds.length > 0) {
      query = query.in('id', taggedDealIds);
    } else if ((filters.tagIds?.length || 0) > 0 && taggedDealIds.length === 0) {
      // No deals match the selected tags, return empty
      return { data: [], count: 0 };
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count };
  };

  // Use paginated query hook
  const {
    data: deals,
    totalCount,
    pageCount,
    currentPage,
    pageSize,
    isLoading,
    isFetching,
    goToPage,
    setPageSize,
  } = usePaginatedQuery<any>({
    queryKey: ['deals-list', pipelineId, JSON.stringify(filters), JSON.stringify(taggedDealIds)],
    queryFn: fetchDeals,
    pageSizeStorageKey: PAGE_SIZE_KEY,
    pageSize: 25,
    enabled: !!pipelineId,
  });

  const handleEditDeal = (deal: any) => {
    setEditingDeal(deal);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingDeal(null);
  };

  if (!pipelineId) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Selecione um pipeline para ver os negócios
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <KanbanFilters filters={filters} onFiltersChange={setFilters} />

      {/* Table */}
      <DealsTable
        deals={deals}
        stages={stages}
        profiles={profiles}
        onEdit={handleEditDeal}
        isLoading={isLoading}
        // Server-side pagination props
        totalCount={totalCount}
        pageCount={pageCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        isFetching={isFetching}
      />

      {/* Deal Form Sheet */}
      <DealFormSheet
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        deal={editingDeal}
        pipelineId={pipelineId || ''}
        stages={stages}
      />
    </div>
  );
}
