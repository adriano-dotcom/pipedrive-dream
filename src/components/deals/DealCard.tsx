import { Draggable } from '@hello-pangea/dnd';
import { Building2, User, Calendar, ListTodo, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DealActivityMini } from './DealActivityMini';
import { QuickActivityForm } from './QuickActivityForm';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Activity {
  id: string;
  title: string;
  activity_type: string;
  due_date: string;
  is_completed: boolean;
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

interface DealCardProps {
  deal: Deal;
  index: number;
  onClick: () => void;
  activities?: Activity[];
  onToggleActivity?: (id: string, completed: boolean) => void;
  isTogglingActivity?: boolean;
  stageColor?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const labelColors: Record<string, { bg: string; text: string; border: string }> = {
  Quente: { bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
  Morno: { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  Frio: { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
};

const insuranceIcons: Record<string, string> = {
  Carga: '🚚',
  Saúde: '🏥',
  Frota: '🚗',
  Vida: '❤️',
  Residencial: '🏠',
  Empresarial: '🏢',
};

export function DealCard({ 
  deal, 
  index, 
  onClick, 
  activities = [], 
  onToggleActivity, 
  isTogglingActivity,
  stageColor = '#6366f1'
}: DealCardProps) {
  const navigate = useNavigate();
  const pendingActivities = activities.filter(a => !a.is_completed).slice(0, 2);
  const pendingCount = activities.filter(a => !a.is_completed).length;

  const handleOpenDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/deals/${deal.id}`);
  };

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            'bg-card/70 backdrop-blur-sm border border-white/[0.08] rounded-xl cursor-pointer',
            'transition-all duration-200 ease-out',
            'hover:shadow-xl hover:-translate-y-1 hover:border-white/[0.15] hover:bg-card/90',
            snapshot.isDragging && [
              'shadow-2xl ring-2 ring-primary/60 rotate-2 scale-[1.03]',
              'bg-card backdrop-blur-xl z-50'
            ]
          )}
          style={{
            ...provided.draggableProps.style,
            animationDelay: `${index * 50}ms`,
          }}
        >
          {/* Colored left border accent */}
          <div className="relative overflow-hidden rounded-xl">
            <div 
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all",
                snapshot.isDragging && "w-1.5"
              )}
              style={{ 
                backgroundColor: stageColor,
                boxShadow: snapshot.isDragging ? `0 0 10px ${stageColor}` : 'none'
              }}
            />
            
            <div className="p-3.5 pl-4">
              {/* Title and Insurance Icon */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-semibold text-sm line-clamp-2 text-foreground/90">
                  {deal.title}
                </h4>
                {deal.insurance_type && insuranceIcons[deal.insurance_type] && (
                  <span className="text-lg flex-shrink-0">{insuranceIcons[deal.insurance_type]}</span>
                )}
              </div>

              {/* Value with emphasis */}
              <div 
                className="text-lg font-bold mb-3 animate-count-up"
                style={{ color: stageColor }}
              >
                {formatCurrency(Number(deal.value || 0))}
              </div>

              {/* Organization/Person with icons */}
              <div className="space-y-1.5 mb-3">
                {deal.organization?.name && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{deal.organization.name}</span>
                  </div>
                )}
                {deal.person?.name && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{deal.person.name}</span>
                  </div>
                )}
              </div>

              {/* Activities Section */}
              {pendingCount > 0 && (
                <div className="border-t border-border/50 pt-2.5 mt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-1.5">
                    <ListTodo className="h-3 w-3" />
                    <span>{pendingCount} atividade{pendingCount > 1 ? 's' : ''}</span>
                  </div>
                  {pendingActivities.map((activity) => (
                    <DealActivityMini
                      key={activity.id}
                      activity={activity}
                      onToggleComplete={onToggleActivity || (() => {})}
                      isLoading={isTogglingActivity}
                    />
                  ))}
                </div>
              )}

              {/* Footer: Labels, Date */}
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/[0.05]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {deal.label && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-2 py-0.5 font-medium hover-shine',
                        labelColors[deal.label]?.bg,
                        labelColors[deal.label]?.text,
                        labelColors[deal.label]?.border
                      )}
                    >
                      {deal.label}
                    </Badge>
                  )}
                  {deal.insurance_type && (
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] px-2 py-0.5 bg-secondary/60 backdrop-blur-sm"
                    >
                      {deal.insurance_type}
                    </Badge>
                  )}
                </div>
                {deal.expected_close_date && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(deal.expected_close_date), 'dd/MM', { locale: ptBR })}
                  </div>
                )}
              </div>

              {/* Quick Add Activity + Open Details */}
              <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center gap-2">
                <div className="flex-1">
                  <QuickActivityForm dealId={deal.id} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={handleOpenDetails}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
