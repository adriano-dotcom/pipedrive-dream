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
        'bg-gradient-to-b from-muted/80 to-muted/40 border border-border/50',
        'shadow-sm transition-all duration-300',
        isDraggingOver && 'ring-2 ring-primary/50 bg-primary/5 shadow-lg scale-[1.01]'
      )}
    >
      {/* Column Header with gradient accent */}
      <div 
        className="p-4 rounded-t-xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${stage.color}15 0%, transparent 100%)`
        }}
      >
        {/* Color accent bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: stage.color }}
        />
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-background"
              style={{ 
                backgroundColor: stage.color,
                boxShadow: `0 0 8px ${stage.color}60`
              }}
            />
            <h3 className="font-semibold text-sm tracking-tight">{stage.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span 
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ 
                backgroundColor: `${stage.color}20`,
                color: stage.color
              }}
            >
              {deals.length}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm font-bold text-foreground/80">
            {formatCurrency(total)}
          </p>
          {stage.probability > 0 && (
            <span className="text-[10px] text-muted-foreground">
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
          'flex-1 p-3 overflow-y-auto space-y-3 transition-colors duration-200',
          isDraggingOver && 'bg-primary/5'
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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div 
              className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
              style={{ backgroundColor: `${stage.color}15` }}
            >
              <Plus className="h-5 w-5" style={{ color: stage.color }} />
            </div>
            <p className="text-xs text-muted-foreground">
              Arraste um negócio aqui
            </p>
          </div>
        )}
      </div>

      {/* Add Deal Button */}
      <div className="p-3 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-center gap-2 text-muted-foreground',
            'hover:text-foreground hover:bg-accent/80',
            'transition-all duration-200'
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
