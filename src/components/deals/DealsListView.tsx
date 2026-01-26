import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealsTable } from './DealsTable';
import { DealFormSheet } from './DealFormSheet';
import { KanbanFilters, KanbanFiltersState } from './KanbanFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Pipeline {
  id: string;
  name: string;
}

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

export function DealsListView({ pipelineId, stages }: DealsListViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
        };
      } catch {
        return { insuranceTypes: [], labels: [], dateRange: { from: null, to: null }, ownerId: null };
      }
    }
    return { insuranceTypes: [], labels: [], dateRange: { from: null, to: null }, ownerId: null };
  });

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('kanban-filters', JSON.stringify(filters));
  }, [filters]);

  // Fetch deals for the selected pipeline (all statuses)
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['deals-list', pipelineId],
    queryFn: async () => {
      let query = supabase
        .from('deals')
        .select(`
          *,
          organization:organizations(id, name),
          person:people(id, name),
          stage:stages(id, name, color)
        `)
        .order('created_at', { ascending: false });
      
      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!pipelineId,
  });

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

  // Filter deals based on active filters
  const filteredDeals = deals.filter((deal: any) => {
    // Insurance type filter
    if (filters.insuranceTypes.length > 0 && 
        (!deal.insurance_type || !filters.insuranceTypes.includes(deal.insurance_type))) {
      return false;
    }
    // Label filter
    if (filters.labels.length > 0 && 
        (!deal.label || !filters.labels.includes(deal.label))) {
      return false;
    }
    // Date range filter (expected_close_date)
    if (filters.dateRange.from && deal.expected_close_date) {
      const dealDate = new Date(deal.expected_close_date);
      if (dealDate < filters.dateRange.from) return false;
    }
    if (filters.dateRange.to && deal.expected_close_date) {
      const dealDate = new Date(deal.expected_close_date);
      if (dealDate > filters.dateRange.to) return false;
    }
    return true;
  });

  const handleEditDeal = (deal: any) => {
    setEditingDeal(deal);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingDeal(null);
  };

  if (dealsLoading) {
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
        deals={filteredDeals}
        stages={stages}
        profiles={profiles}
        onEdit={handleEditDeal}
        isLoading={dealsLoading}
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
