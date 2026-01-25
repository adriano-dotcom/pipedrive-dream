import { useState } from 'react';
import { format, isToday, isYesterday, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckSquare, 
  Phone, 
  Calendar, 
  Mail, 
  Clock,
  AlertCircle,
  Building2,
  User,
  Briefcase
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

type Activity = Tables<'activities'> & {
  deal?: { title: string } | null;
  person?: { name: string } | null;
  organization?: { name: string } | null;
};

interface ActivityCardProps {
  activity: Activity;
  onToggleComplete: (id: string, completed: boolean) => void;
  onClick: () => void;
}

const activityTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  task: { icon: CheckSquare, label: 'Tarefa', color: 'text-blue-500' },
  call: { icon: Phone, label: 'Ligação', color: 'text-green-500' },
  meeting: { icon: Calendar, label: 'Reunião', color: 'text-purple-500' },
  email: { icon: Mail, label: 'Email', color: 'text-orange-500' },
  deadline: { icon: Clock, label: 'Prazo', color: 'text-red-500' },
};

const priorityConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  low: { label: 'Baixa', variant: 'secondary' },
  normal: { label: 'Normal', variant: 'default' },
  high: { label: 'Alta', variant: 'destructive' },
};

export function ActivityCard({ activity, onToggleComplete, onClick }: ActivityCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const typeConfig = activityTypeConfig[activity.activity_type] || activityTypeConfig.task;
  const TypeIcon = typeConfig.icon;
  
  const dueDate = parseISO(activity.due_date);
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && !activity.is_completed;
  
  const formatDueDate = () => {
    if (isToday(dueDate)) return 'Hoje';
    if (isYesterday(dueDate)) return 'Ontem';
    return format(dueDate, "dd 'de' MMM", { locale: ptBR });
  };
  
  const handleCheckboxChange = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await onToggleComplete(activity.id, checked);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const linkedItem = activity.deal?.title || activity.person?.name || activity.organization?.name;
  const linkedIcon = activity.deal_id ? Briefcase : activity.person_id ? User : activity.organization_id ? Building2 : null;
  const LinkedIcon = linkedIcon;
  
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group",
        activity.is_completed && "opacity-60",
        isOverdue && !activity.is_completed && "border-destructive/50 bg-destructive/5"
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={activity.is_completed}
          onCheckedChange={handleCheckboxChange}
          disabled={isUpdating}
          className="mt-0.5"
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TypeIcon className={cn("h-4 w-4 flex-shrink-0", typeConfig.color)} />
          <span className={cn(
            "font-medium truncate",
            activity.is_completed && "line-through text-muted-foreground"
          )}>
            {activity.title}
          </span>
          {activity.priority === 'high' && !activity.is_completed && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              Alta
            </Badge>
          )}
        </div>
        
        {/* Description preview */}
        {activity.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {activity.description}
          </p>
        )}
        
        {/* Linked item */}
        {linkedItem && LinkedIcon && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <LinkedIcon className="h-3 w-3" />
            <span className="truncate">{linkedItem}</span>
          </div>
        )}
      </div>
      
      {/* Due date */}
      <div className={cn(
        "flex items-center gap-1.5 text-sm whitespace-nowrap",
        isOverdue && !activity.is_completed ? "text-destructive font-medium" : "text-muted-foreground"
      )}>
        {isOverdue && !activity.is_completed && (
          <AlertCircle className="h-4 w-4" />
        )}
        <span>{formatDueDate()}</span>
        {activity.due_time && (
          <span className="text-xs">
            {activity.due_time.slice(0, 5)}
          </span>
        )}
      </div>
    </div>
  );
}
