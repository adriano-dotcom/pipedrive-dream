import { Briefcase, Plus, Settings2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewModeSelector, ViewMode } from './ViewModeSelector';
import { PipelineSelector } from './PipelineSelector';

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean | null;
}

interface DealsHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  onPipelineSelect: (pipeline: Pipeline) => void;
  onCreatePipeline: () => void;
  onEditPipeline: (pipeline: Pipeline) => void;
  onOpenStageManager: () => void;
  onAddDeal: () => void;
  onSetUserDefault: (pipelineId: string) => void;
  userDefaultPipelineId: string | null;
  dealCount: number;
  totalDeals: number;
  totalValue: number;
}

export function DealsHeader({
  viewMode,
  onViewModeChange,
  pipelines,
  selectedPipeline,
  onPipelineSelect,
  onCreatePipeline,
  onEditPipeline,
  onOpenStageManager,
  onAddDeal,
  onSetUserDefault,
  userDefaultPipelineId,
  dealCount,
  totalDeals,
  totalValue,
}: DealsHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="text-gradient">Negócios</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-muted-foreground">
              {dealCount} negócio{dealCount !== 1 ? 's' : ''} 
              {dealCount !== totalDeals && ` (de ${totalDeals})`}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold text-primary animate-count-up">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                }).format(totalValue)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 flex-wrap">
        <ViewModeSelector value={viewMode} onChange={onViewModeChange} />
        
        <PipelineSelector
          pipelines={pipelines}
          selectedPipeline={selectedPipeline}
          onSelect={onPipelineSelect}
          onCreateNew={onCreatePipeline}
          onEdit={onEditPipeline}
          onSetUserDefault={onSetUserDefault}
          userDefaultPipelineId={userDefaultPipelineId}
        />
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={onOpenStageManager}
          title="Gerenciar etapas"
          className="border-border/50 hover:border-primary/30 hover:bg-primary/5"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        
        <Button onClick={onAddDeal} className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30">
          <Plus className="h-4 w-4 mr-2" />
          Novo Negócio
        </Button>
      </div>
    </div>
  );
}
