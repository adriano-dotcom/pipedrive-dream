import { Draggable } from '@hello-pangea/dnd';
import { Building2, User, Calendar, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const labelColors: Record<string, string> = {
  Quente: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
  Morno: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  Frio: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
};

const insuranceIcons: Record<string, string> = {
  Carga: '🚚',
  Saúde: '🏥',
  Frota: '🚗',
  Vida: '❤️',
  Residencial: '🏠',
  Empresarial: '🏢',
};

export function DealCard({ deal, index, onClick }: DealCardProps) {
  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            'bg-card border border-border rounded-lg p-3 cursor-pointer',
            'hover:shadow-md transition-shadow duration-200',
            snapshot.isDragging && 'shadow-lg ring-2 ring-primary/50'
          )}
        >
          {/* Title and Value */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-sm line-clamp-2">{deal.title}</h4>
            {deal.insurance_type && insuranceIcons[deal.insurance_type] && (
              <span className="text-lg">{insuranceIcons[deal.insurance_type]}</span>
            )}
          </div>

          {/* Value */}
          <p className="text-lg font-bold text-primary mb-2">
            {formatCurrency(Number(deal.value || 0))}
          </p>

          {/* Organization/Person */}
          <div className="space-y-1 text-xs text-muted-foreground mb-2">
            {deal.organization?.name && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{deal.organization.name}</span>
              </div>
            )}
            {deal.person?.name && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate">{deal.person.name}</span>
              </div>
            )}
          </div>

          {/* Footer: Labels and Date */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {deal.label && (
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0', labelColors[deal.label])}
                >
                  {deal.label}
                </Badge>
              )}
              {deal.insurance_type && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
        </div>
      )}
    </Draggable>
  );
}
