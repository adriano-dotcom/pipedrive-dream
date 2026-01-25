import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { KanbanColumn } from './KanbanColumn';
import { DealFormSheet } from './DealFormSheet';
import { PipelineSelector } from './PipelineSelector';
import { PipelineFormSheet } from './PipelineFormSheet';
import { Button } from '@/components/ui/button';
import { Plus, Briefcase, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

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

export function KanbanBoard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [isPipelineFormOpen, setIsPipelineFormOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);

  // Fetch all pipelines
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Pipeline[];
    },
  });

  // Set default pipeline on load
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipeline) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipeline(defaultPipeline);
    }
  }, [pipelines, selectedPipeline]);

  // Fetch stages for the selected pipeline
  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ['stages', selectedPipeline?.id],
    queryFn: async () => {
      if (!selectedPipeline?.id) return [];
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('pipeline_id', selectedPipeline.id)
        .order('position');
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!selectedPipeline?.id,
  });

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
        .order('due_date', { ascending: true });
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
        description: error.message,
      });
    },
  });

  const handleToggleActivity = (id: string, completed: boolean) => {
    toggleActivityMutation.mutate({ id, completed });
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
        description: error.message,
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

  const handleCreatePipeline = () => {
    setEditingPipeline(null);
    setIsPipelineFormOpen(true);
  };

  // Group deals by stage
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter((deal) => deal.stage_id === stage.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  // Calculate totals per stage
  const totalsByStage = stages.reduce((acc, stage) => {
    const stageDeals = dealsByStage[stage.id] || [];
    acc[stage.id] = stageDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate total pipeline value
  const totalPipelineValue = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);

  if (pipelinesLoading || stagesLoading || dealsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="min-w-[300px] h-[500px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              Negócios
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-muted-foreground">
                {deals.length} negócio{deals.length !== 1 ? 's' : ''} aberto{deals.length !== 1 ? 's' : ''}
              </span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm font-medium text-primary flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                }).format(totalPipelineValue)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <PipelineSelector
            pipelines={pipelines}
            selectedPipeline={selectedPipeline}
            onSelect={setSelectedPipeline}
            onCreateNew={handleCreatePipeline}
          />
          <Button onClick={() => handleAddDeal()} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Negócio
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
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

      {/* Pipeline Form Sheet */}
      <PipelineFormSheet
        open={isPipelineFormOpen}
        onOpenChange={setIsPipelineFormOpen}
        pipeline={editingPipeline}
      />
    </div>
  );
}
