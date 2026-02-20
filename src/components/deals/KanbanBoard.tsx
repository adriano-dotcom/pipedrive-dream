import { useState, useEffect, useMemo } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { KanbanColumn } from './KanbanColumn';
import { DealFormSheet } from './DealFormSheet';
import { KanbanFilters, KanbanFiltersState } from './KanbanFilters';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/supabaseErrors';
import { Skeleton } from '@/components/ui/skeleton';
import { NextActivityDialog } from './detail/NextActivityDialog';

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean | null;
}

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
  probability: number;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage_id: string;
  pipeline_id: string;
  organization_id: string | null;
  person_id: string | null;
  insurance_type: string | null;
  label: string | null;
  expected_close_date: string | null;
  status: string;
  organization?: { name: string } | null;
  person?: { name: string } | null;
}

interface Activity {
  id: string;
  title: string;
  activity_type: string;
  due_date: string;
  is_completed: boolean;
  deal_id: string;
}

interface KanbanBoardProps {
  selectedPipeline: Pipeline | null;
  stages: Stage[];
  stagesLoading?: boolean;
}

export function KanbanBoard({ selectedPipeline, stages = [], stagesLoading }: KanbanBoardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showNextActivityDialog, setShowNextActivityDialog] = useState(false);
  const [completedActivityDealId, setCompletedActivityDealId] = useState<string | null>(null);
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

  // Fetch deals for the selected pipeline
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['deals', selectedPipeline?.id],
    queryFn: async () => {
      if (!selectedPipeline?.id) return [];
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          organization:organizations(name),
          person:people(name)
        `)
        .eq('pipeline_id', selectedPipeline.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Deal[];
    },
    enabled: !!selectedPipeline?.id,
  });

  // Fetch activities for all deals in the pipeline
  const { data: allActivities = [] } = useQuery({
    queryKey: ['kanban-activities', deals.map(d => d.id).join(',')],
    queryFn: async () => {
      if (deals.length === 0) return [];
      const dealIds = deals.map(d => d.id);
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, activity_type, due_date, is_completed, deal_id')
        .in('deal_id', dealIds)
        .order('due_date', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as Activity[];
    },
    enabled: deals.length > 0,
  });

  // Group activities by deal
  const activitiesByDeal = allActivities.reduce((acc, activity) => {
    const dealId = activity.deal_id;
    if (!acc[dealId]) acc[dealId] = [];
    acc[dealId].push(activity);
    return acc;
  }, {} as Record<string, Activity[]>);

  // Mutation to toggle activity completion
  const [togglingActivityId, setTogglingActivityId] = useState<string | null>(null);
  
  const toggleActivityMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      setTogglingActivityId(id);
      const { error } = await supabase
        .from('activities')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setTogglingActivityId(null);
    },
    onError: (error) => {
      setTogglingActivityId(null);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar atividade',
        description: getErrorMessage(error),
      });
    },
  });

  const handleToggleActivity = async (id: string, completed: boolean) => {
    // Encontrar o deal_id da atividade antes de atualizar
    const activity = Object.values(activitiesByDeal).flat().find(a => a.id === id);
    
    await toggleActivityMutation.mutateAsync({ id, completed });
    
    // Se marcou como concluída, abrir dialog para próxima atividade
    if (completed && activity?.deal_id) {
      setCompletedActivityDealId(activity.deal_id);
      setShowNextActivityDialog(true);
    }
  };

  // Mutation to update deal stage
  const updateDealStage = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: stageId })
        .eq('id', dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao mover negócio',
        description: getErrorMessage(error),
      });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    updateDealStage.mutate({
      dealId: draggableId,
      stageId: destination.droppableId,
    });
  };

  const handleAddDeal = (stageId?: string) => {
    setEditingDeal(stageId ? { stage_id: stageId } as Deal : null);
    setIsFormOpen(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingDeal(null);
  };

  // Fetch deal tag assignments for filtering
  const { data: dealTagAssignments = [] } = useQuery({
    queryKey: ['deal-tag-filter-assignments', filters.tagIds],
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

  // Filter deals based on active filters
  const filteredDeals = useMemo(() => {
    const tagFilterSet = new Set(dealTagAssignments);
    
    return deals.filter((deal) => {
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
      // Tag filter
      if ((filters.tagIds?.length || 0) > 0 && !tagFilterSet.has(deal.id)) {
        return false;
      }
      return true;
    });
  }, [deals, filters, dealTagAssignments]);

  // Group deals by stage
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = filteredDeals.filter((deal) => deal.stage_id === stage.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  // Calculate totals per stage
  const totalsByStage = stages.reduce((acc, stage) => {
    const stageDeals = dealsByStage[stage.id] || [];
    acc[stage.id] = stageDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  if (stagesLoading || dealsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="min-w-[300px] h-[500px] rounded-xl kanban-column relative overflow-hidden"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              <div className="p-4 space-y-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-16" />
                <div className="space-y-3 mt-6">
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Empty state onboarding */}
      {deals.length === 0 && !dealsLoading && (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-border/50 rounded-xl bg-muted/10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Briefcase className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Nenhum negócio neste pipeline</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Comece criando seu primeiro negócio para acompanhar o progresso das suas vendas.
          </p>
        </div>
      )}

      {/* Filters */}
      <KanbanFilters filters={filters} onFiltersChange={setFilters} />

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
          {stages.map((stage) => (
            <Droppable key={stage.id} droppableId={stage.id}>
              {(provided, snapshot) => (
                <KanbanColumn
                  stage={stage}
                  deals={dealsByStage[stage.id] || []}
                  total={totalsByStage[stage.id] || 0}
                  provided={provided}
                  isDraggingOver={snapshot.isDraggingOver}
                  onAddDeal={() => handleAddDeal(stage.id)}
                  onEditDeal={handleEditDeal}
                  activitiesByDeal={activitiesByDeal}
                  onToggleActivity={handleToggleActivity}
                  togglingActivityId={togglingActivityId}
                />
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* Deal Form Sheet */}
      <DealFormSheet
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        deal={editingDeal}
        pipelineId={selectedPipeline?.id || ''}
        stages={stages}
      />

      {/* Next Activity Dialog */}
      {completedActivityDealId && (
        <NextActivityDialog
          open={showNextActivityDialog}
          onOpenChange={(open) => {
            setShowNextActivityDialog(open);
            if (!open) setCompletedActivityDealId(null);
          }}
          dealId={completedActivityDealId}
        />
      )}
    </div>
  );
}
