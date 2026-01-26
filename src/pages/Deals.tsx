import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KanbanBoard } from '@/components/deals/KanbanBoard';
import { DealsListView } from '@/components/deals/DealsListView';
import { DealsHeader } from '@/components/deals/DealsHeader';
import { PipelineFormSheet } from '@/components/deals/PipelineFormSheet';
import { StageManagerSheet } from '@/components/deals/StageManagerSheet';
import { DealFormSheet } from '@/components/deals/DealFormSheet';
import { ViewMode } from '@/components/deals/ViewModeSelector';
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

export default function Deals() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('deals-view-mode');
    return (saved as ViewMode) || 'kanban';
  });
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [isPipelineFormOpen, setIsPipelineFormOpen] = useState(false);
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);
  const [isDealFormOpen, setIsDealFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('deals-view-mode', viewMode);
  }, [viewMode]);

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

  // Fetch deals for counting and total value
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['deals-count', selectedPipeline?.id],
    queryFn: async () => {
      if (!selectedPipeline?.id) return [];
      const { data, error } = await supabase
        .from('deals')
        .select('id, value, status')
        .eq('pipeline_id', selectedPipeline.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPipeline?.id,
  });

  const openDeals = deals.filter(d => d.status === 'open');
  const totalValue = openDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);

  const handleAddDeal = () => {
    setEditingDeal(null);
    setIsDealFormOpen(true);
  };

  if (pipelinesLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full animate-fade-in">
      {/* Shared Header */}
      <DealsHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pipelines={pipelines}
        selectedPipeline={selectedPipeline}
        onPipelineSelect={setSelectedPipeline}
        onCreatePipeline={() => setIsPipelineFormOpen(true)}
        onOpenStageManager={() => setIsStageManagerOpen(true)}
        onAddDeal={handleAddDeal}
        dealCount={openDeals.length}
        totalDeals={deals.length}
        totalValue={totalValue}
      />

      {/* View Content */}
      {viewMode === 'kanban' ? (
        <KanbanBoard 
          selectedPipeline={selectedPipeline}
          stages={stages}
          stagesLoading={stagesLoading}
        />
      ) : (
        <DealsListView 
          pipelineId={selectedPipeline?.id || null}
          stages={stages}
        />
      )}

      {/* Pipeline Form Sheet */}
      <PipelineFormSheet
        open={isPipelineFormOpen}
        onOpenChange={setIsPipelineFormOpen}
        pipeline={null}
      />

      {/* Stage Manager Sheet */}
      {selectedPipeline && (
        <StageManagerSheet
          open={isStageManagerOpen}
          onOpenChange={setIsStageManagerOpen}
          pipelineId={selectedPipeline.id}
          pipelineName={selectedPipeline.name}
        />
      )}

      {/* Deal Form Sheet */}
      <DealFormSheet
        open={isDealFormOpen}
        onOpenChange={setIsDealFormOpen}
        deal={editingDeal}
        pipelineId={selectedPipeline?.id || ''}
        stages={stages}
      />
    </div>
  );
}
