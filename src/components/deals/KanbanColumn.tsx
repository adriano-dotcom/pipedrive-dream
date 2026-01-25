import { DroppableProvided } from '@hello-pangea/dnd';
import { DealCard } from './DealCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface KanbanColumnProps {
  stage: Stage;
  deals: Deal[];
  total: number;
  provided: DroppableProvided;
  isDraggingOver: boolean;
  onAddDeal: () => void;
  onEditDeal: (deal: Deal) => void;
  activitiesByDeal?: Record<string, Activity[]>;
  onToggleActivity?: (id: string, completed: boolean) => void;
  togglingActivityId?: string | null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KanbanColumn({
  stage,
  deals,
  total,
  provided,
  isDraggingOver,
  onAddDeal,
  onEditDeal,
  activitiesByDeal = {},
  onToggleActivity,
  togglingActivityId,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        'min-w-[300px] max-w-[300px] rounded-xl flex flex-col h-full',
        'kanban-column',
        'transition-all duration-300 ease-out',
        isDraggingOver && 'kanban-drop-active scale-[1.01]'
      )}
    >
      {/* Column Header with gradient accent */}
      <div 
        className="p-4 rounded-t-xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${stage.color}20 0%, transparent 100%)`
        }}
      >
        {/* Color accent bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ 
            backgroundColor: stage.color,
            boxShadow: `0 0 15px ${stage.color}60`
          }}
        />
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                isDraggingOver && "animate-pulse-soft scale-110"
              )}
              style={{ 
                backgroundColor: stage.color,
                boxShadow: `0 0 12px ${stage.color}80`
              }}
            />
            <h3 className="font-semibold text-sm tracking-tight">{stage.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span 
              className="text-xs font-bold px-2.5 py-1 rounded-full transition-all"
              style={{ 
                backgroundColor: `${stage.color}25`,
                color: stage.color,
                boxShadow: isDraggingOver ? `0 0 10px ${stage.color}40` : 'none'
              }}
            >
              {deals.length}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <p 
            className="text-sm font-bold animate-count-up"
            style={{ color: stage.color }}
          >
            {formatCurrency(total)}
          </p>
          {stage.probability > 0 && (
            <span className="text-[10px] text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-full">
              {stage.probability}% prob.
            </span>
          )}
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={cn(
          'flex-1 p-3 overflow-y-auto space-y-3 transition-all duration-300 scrollbar-modern',
          isDraggingOver && 'bg-gradient-to-b from-primary/10 to-transparent'
        )}
      >
        {deals.map((deal, index) => (
          <DealCard
            key={deal.id}
            deal={deal}
            index={index}
            onClick={() => onEditDeal(deal)}
            activities={activitiesByDeal[deal.id] || []}
            onToggleActivity={onToggleActivity}
            isTogglingActivity={!!togglingActivityId}
            stageColor={stage.color}
          />
        ))}
        {provided.placeholder}
        
        {deals.length === 0 && (
          <div className={cn(
            "flex flex-col items-center justify-center py-8 text-center",
            "border-2 border-dashed rounded-xl transition-all duration-300",
            isDraggingOver 
              ? "border-primary bg-primary/5" 
              : "border-border/50"
          )}>
            <div 
              className={cn(
                "w-12 h-12 rounded-full mb-3 flex items-center justify-center transition-all",
                isDraggingOver && "animate-float"
              )}
              style={{ backgroundColor: `${stage.color}20` }}
            >
              <Plus className="h-5 w-5" style={{ color: stage.color }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {isDraggingOver ? 'Solte aqui!' : 'Arraste um negócio aqui'}
            </p>
          </div>
        )}
      </div>

      {/* Add Deal Button */}
      <div className="p-3 border-t border-white/[0.05]">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-center gap-2',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-white/[0.05] active:bg-white/[0.08]',
            'transition-all duration-200',
            'border border-transparent hover:border-white/[0.08]'
          )}
          onClick={onAddDeal}
        >
          <Plus className="h-4 w-4" />
          Adicionar negócio
        </Button>
      </div>
    </div>
  );
}
