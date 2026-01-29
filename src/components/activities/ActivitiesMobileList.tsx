import { format, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckSquare, 
  Phone, 
  Calendar, 
  Mail, 
  Clock,
  AlertCircle,
  MessageCircle,
  Building2,
  User,
  Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';
import { useState } from 'react';

export type Activity = Tables<'activities'> & {
  deal?: { id?: string; title: string } | null;
  person?: { id?: string; name: string; phone?: string | null; email?: string | null } | null;
  organization?: { id?: string; name: string } | null;
  creator?: { full_name: string } | null;
};

interface ActivitiesMobileListProps {
  activities: Activity[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (activity: Activity) => void;
}

const activityTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  task: { icon: CheckSquare, label: 'Tarefa', color: 'text-info' },
  call: { icon: Phone, label: 'Ligação', color: 'text-success' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'text-success' },
  meeting: { icon: Calendar, label: 'Reunião', color: 'text-primary' },
  email: { icon: Mail, label: 'Email', color: 'text-warning' },
  deadline: { icon: Clock, label: 'Prazo', color: 'text-destructive' },
};

export function ActivitiesMobileList({ activities, onToggleComplete, onEdit }: ActivitiesMobileListProps) {
  const navigate = useNavigate();
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const formatDueDate = (dateStr: string, timeStr: string | null) => {
    const date = parseISO(dateStr);
    const formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR });
    const formattedTime = timeStr ? timeStr.slice(0, 5) : null;
    return { formattedDate, formattedTime };
  };

  const isOverdue = (activity: Activity) => {
    const dueDate = parseISO(activity.due_date);
    return isPast(dueDate) && !isToday(dueDate) && !activity.is_completed;
  };

  const handleCheckboxChange = async (id: string, checked: boolean) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      await onToggleComplete(id, checked);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getLinkedEntity = (activity: Activity) => {
    if (activity.deal) {
      return { type: 'deal', icon: Briefcase, name: activity.deal.title, id: activity.deal_id, path: `/deals/${activity.deal_id}` };
    }
    if (activity.person) {
      return { type: 'person', icon: User, name: activity.person.name, id: activity.person_id, path: `/people/${activity.person_id}` };
    }
    if (activity.organization) {
      return { type: 'organization', icon: Building2, name: activity.organization.name, id: activity.organization_id, path: `/organizations/${activity.organization_id}` };
    }
    return null;
  };

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 p-4">
      {activities.map((activity) => {
        const typeConfig = activityTypeConfig[activity.activity_type] || activityTypeConfig.task;
        const TypeIcon = typeConfig.icon;
        const overdue = isOverdue(activity);
        const { formattedDate, formattedTime } = formatDueDate(activity.due_date, activity.due_time);
        const linkedEntity = getLinkedEntity(activity);

        return (
          <div 
            key={activity.id} 
            className={cn(
              "ios-glass p-4 rounded-xl space-y-3",
              activity.is_completed && "opacity-60"
            )}
            onClick={() => onEdit(activity)}
          >
            {/* Header with checkbox, type icon, and title */}
            <div className="flex items-start gap-3">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={activity.is_completed}
                  onCheckedChange={(checked) => handleCheckboxChange(activity.id, checked as boolean)}
                  disabled={updatingIds.has(activity.id)}
                  className="mt-0.5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <TypeIcon className={cn("h-4 w-4 flex-shrink-0", typeConfig.color)} />
                  <span className={cn(
                    "font-medium truncate",
                    activity.is_completed && "line-through text-muted-foreground"
                  )}>
                    {activity.title}
                  </span>
                </div>
                {activity.priority === 'high' && !activity.is_completed && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    Alta Prioridade
                  </Badge>
                )}
              </div>
            </div>

            {/* Due date */}
            <div className={cn(
              "flex items-center gap-1.5 text-sm",
              overdue ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              {overdue && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
              <Calendar className="h-3.5 w-3.5" />
              <span>{formattedDate}</span>
              {formattedTime && (
                <span className="text-xs opacity-75">às {formattedTime}</span>
              )}
            </div>

            {/* Person and Organization */}
            <div className="flex flex-wrap gap-2 text-sm">
              {activity.person && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activity.person_id) navigate(`/people/${activity.person_id}`);
                  }}
                >
                  <User className="h-3 w-3 mr-1" />
                  {activity.person.name}
                </Badge>
              )}
              {activity.organization && (
                <Badge 
                  variant="outline" 
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activity.organization_id) navigate(`/organizations/${activity.organization_id}`);
                  }}
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  {activity.organization.name}
                </Badge>
              )}
            </div>

            {/* Linked entity and creator */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
              {linkedEntity && (
                <Badge 
                  variant="outline" 
                  className="cursor-pointer text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (linkedEntity.id) navigate(linkedEntity.path);
                  }}
                >
                  <linkedEntity.icon className="h-3 w-3 mr-1" />
                  {linkedEntity.type === 'deal' ? 'Negócio' : linkedEntity.type === 'person' ? 'Pessoa' : 'Org'}
                </Badge>
              )}
              {activity.creator?.full_name && (
                <span>Criado por: {activity.creator.full_name}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
