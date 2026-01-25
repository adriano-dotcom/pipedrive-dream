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
        'min-w-[280px] max-w-[280px] rounded-lg flex flex-col h-full',
        'bg-muted/50 border border-border',
        isDraggingOver && 'ring-2 ring-primary/50 bg-primary/5'
      )}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-sm">{stage.name}</h3>
            <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
              {deals.length}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatCurrency(total)}
        </p>
      </div>

      {/* Column Content */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className="flex-1 p-2 overflow-y-auto space-y-2"
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
          />
        ))}
        {provided.placeholder}
      </div>

      {/* Add Deal Button */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onAddDeal}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
