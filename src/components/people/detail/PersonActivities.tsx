import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Phone, 
  Mail, 
  Users, 
  CheckSquare,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PersonActivity } from '@/hooks/usePersonDetails';

interface PersonActivitiesProps {
  activities: PersonActivity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'call':
      return <Phone className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'meeting':
      return <Users className="h-4 w-4" />;
    case 'task':
      return <CheckSquare className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getActivityTypeLabel = (type: string) => {
  switch (type) {
    case 'call':
      return 'Ligação';
    case 'email':
      return 'Email';
    case 'meeting':
      return 'Reunião';
    case 'task':
      return 'Tarefa';
    case 'deadline':
      return 'Prazo';
    default:
      return type;
  }
};

const getPriorityColor = (priority: string | null) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getPriorityLabel = (priority: string | null) => {
  switch (priority) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Média';
    case 'low':
      return 'Baixa';
    default:
      return 'Normal';
  }
};

export function PersonActivities({ activities }: PersonActivitiesProps) {
  const pendingActivities = activities.filter(a => !a.is_completed);
  const completedActivities = activities.filter(a => a.is_completed);

  if (activities.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">Nenhuma atividade</h3>
          <p className="text-sm text-muted-foreground">
            Crie atividades vinculadas a esta pessoa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Activities */}
      {pendingActivities.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Pendentes ({pendingActivities.length})
          </h3>
          <div className="space-y-2">
            {pendingActivities.map((activity) => {
              const dueDate = new Date(activity.due_date);
              const isOverdue = isPast(dueDate) && !isToday(dueDate);
              const isDueToday = isToday(dueDate);

              return (
                <Card 
                  key={activity.id} 
                  className={`glass border-border/50 ${isOverdue ? 'border-destructive/30' : ''}`}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                      }`}>
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{activity.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {getActivityTypeLabel(activity.activity_type)}
                          </Badge>
                          {activity.priority && activity.priority !== 'normal' && (
                            <Badge variant="secondary" className={`text-xs ${getPriorityColor(activity.priority)}`}>
                              {getPriorityLabel(activity.priority)}
                            </Badge>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          {isOverdue && (
                            <span className="text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Atrasada
                            </span>
                          )}
                          {isDueToday && !isOverdue && (
                            <span className="text-primary font-medium">Hoje</span>
                          )}
                          <span className="text-muted-foreground">
                            {format(dueDate, 'dd/MM/yy', { locale: ptBR })}
                            {activity.due_time && ` às ${activity.due_time.slice(0, 5)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Activities */}
      {completedActivities.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
            <CheckSquare className="h-4 w-4" />
            Concluídas ({completedActivities.length})
          </h3>
          <div className="space-y-2">
            {completedActivities.map((activity) => (
              <Card key={activity.id} className="glass border-border/50 opacity-60">
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <Checkbox checked disabled className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm line-through">{activity.title}</span>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getActivityTypeLabel(activity.activity_type)}
                        </Badge>
                        {activity.completed_at && (
                          <span>
                            Concluída em {format(new Date(activity.completed_at), 'dd/MM/yy', { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
