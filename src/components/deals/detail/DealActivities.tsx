import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, 
  Mail, 
  Calendar, 
  CheckSquare, 
  Users, 
  Clock,
  CheckCircle2,
  Circle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Activity {
  id: string;
  title: string;
  activity_type: string;
  due_date: string;
  due_time: string | null;
  is_completed: boolean;
  completed_at: string | null;
  priority: string | null;
  description?: string | null;
  notes?: string | null;
  duration_minutes?: number | null;
  deal_id?: string | null;
  person_id?: string | null;
  organization_id?: string | null;
}

interface DealActivitiesProps {
  activities: Activity[];
  onToggleActivity: (activityId: string, completed: boolean) => Promise<{ completed: boolean }>;
  onActivityCompleted: () => void;
  onNewActivity: () => void;
  onEditActivity: (activity: Activity) => void;
  isToggling?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CheckSquare,
  deadline: Clock,
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
  normal: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  low: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export function DealActivities({ 
  activities, 
  onToggleActivity, 
  onActivityCompleted,
  onNewActivity,
  onEditActivity,
  isToggling 
}: DealActivitiesProps) {
  const pendingActivities = activities.filter(a => !a.is_completed);
  const completedActivities = activities.filter(a => a.is_completed);

  const handleToggle = async (activityId: string, currentCompleted: boolean) => {
    const result = await onToggleActivity(activityId, !currentCompleted);
    // Se marcou como concluída, abre dialog para próxima atividade
    if (result.completed) {
      onActivityCompleted();
    }
  };

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Nenhuma atividade</p>
        <p className="text-sm text-muted-foreground/70 mb-4">Adicione atividades para acompanhar este negócio</p>
        <Button onClick={onNewActivity} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>
    );
  }

  const renderActivity = (activity: Activity) => {
    const Icon = typeIcons[activity.activity_type] || CheckSquare;
    const dueDate = new Date(activity.due_date);
    const isOverdue = !activity.is_completed && isPast(dueDate) && !isToday(dueDate);
    const isDueToday = isToday(dueDate);

    const handleCardClick = (e: React.MouseEvent) => {
      // Prevent opening edit when clicking on checkbox
      const target = e.target as HTMLElement;
      if (target.closest('button[role="checkbox"]')) return;
      onEditActivity(activity);
    };

    return (
      <div
        key={activity.id}
        onClick={handleCardClick}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
          "bg-card/50 hover:bg-card/80",
          activity.is_completed && "opacity-60",
          isOverdue && "border-red-500/30 bg-red-500/5"
        )}
      >
        {/* Checkbox */}
        <div className="mt-0.5">
          <Checkbox
            checked={activity.is_completed}
            onCheckedChange={() => handleToggle(activity.id, activity.is_completed)}
            disabled={isToggling}
            className={cn(
              "h-5 w-5",
              activity.is_completed && "bg-green-500 border-green-500 text-white",
              isOverdue && !activity.is_completed && "border-red-500"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className={cn(
              "text-sm font-medium",
              activity.is_completed && "line-through text-muted-foreground"
            )}>
              {activity.title}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activity.is_completed && activity.completed_at ? (
              <span className="text-xs text-green-500">
                Concluída em {format(new Date(activity.completed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </span>
            ) : (
              <span className={cn(
                "text-xs",
                isOverdue ? "text-red-400" : isDueToday ? "text-amber-400" : "text-muted-foreground"
              )}>
                {isOverdue && "Atrasada • "}
                {isDueToday && "Hoje • "}
                {format(dueDate, "d 'de' MMM", { locale: ptBR })}
                {activity.due_time && ` às ${activity.due_time.slice(0, 5)}`}
              </span>
            )}

            {activity.priority && activity.priority !== 'normal' && (
              <Badge 
                variant="outline" 
                className={cn("text-[10px] px-1.5 py-0", priorityColors[activity.priority])}
              >
                {activity.priority === 'high' ? 'Alta' : 'Baixa'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with New Activity Button */}
      <div className="flex items-center justify-end">
        <Button onClick={onNewActivity} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {/* Pending Activities */}
      {pendingActivities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Circle className="h-4 w-4" />
            Pendentes ({pendingActivities.length})
          </h4>
          <div className="space-y-2">
            {pendingActivities.map(renderActivity)}
          </div>
        </div>
      )}

      {/* Completed Activities */}
      {completedActivities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Concluídas ({completedActivities.length})
          </h4>
          <div className="space-y-2">
            {completedActivities.map(renderActivity)}
          </div>
        </div>
      )}
    </div>
  );
}
