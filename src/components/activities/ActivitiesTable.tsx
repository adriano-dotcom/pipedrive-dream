import { useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

export type Activity = Tables<'activities'> & {
  deal?: { id?: string; title: string } | null;
  person?: { id?: string; name: string; phone?: string | null; email?: string | null } | null;
  organization?: { id?: string; name: string } | null;
  creator?: { full_name: string } | null;
};

interface ActivitiesTableProps {
  activities: Activity[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (activity: Activity) => void;
}

const activityTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  task: { icon: CheckSquare, label: 'Tarefa', color: 'text-blue-500' },
  call: { icon: Phone, label: 'Ligação', color: 'text-green-500' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'text-emerald-500' },
  meeting: { icon: Calendar, label: 'Reunião', color: 'text-purple-500' },
  email: { icon: Mail, label: 'Email', color: 'text-orange-500' },
  deadline: { icon: Clock, label: 'Prazo', color: 'text-red-500' },
};

export function ActivitiesTable({ activities, onToggleComplete, onEdit }: ActivitiesTableProps) {
  const navigate = useNavigate();
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

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

  const getLinkedEntity = (activity: Activity) => {
    if (activity.deal) {
      return { type: 'deal', icon: Briefcase, name: activity.deal.title, id: activity.deal_id };
    }
    if (activity.person) {
      return { type: 'person', icon: User, name: activity.person.name, id: activity.person_id };
    }
    if (activity.organization) {
      return { type: 'organization', icon: Building2, name: activity.organization.name, id: activity.organization_id };
    }
    return null;
  };

  if (activities.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <span className="sr-only">Concluído</span>
              </TableHead>
              <TableHead className="min-w-[200px]">Assunto</TableHead>
              <TableHead className="w-[150px]">Criado por</TableHead>
              <TableHead className="w-[180px]">Pessoa de contato</TableHead>
              <TableHead className="w-[130px]">Data de vencimento</TableHead>
              <TableHead className="w-[180px]">Organização</TableHead>
              <TableHead className="w-[130px]">Telefone</TableHead>
              <TableHead className="w-[180px]">E-mail</TableHead>
              <TableHead className="w-[100px]">Vinculado a</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => {
              const typeConfig = activityTypeConfig[activity.activity_type] || activityTypeConfig.task;
              const TypeIcon = typeConfig.icon;
              const { formattedDate, formattedTime } = formatDueDate(activity.due_date, activity.due_time);
              const overdue = isOverdue(activity);
              const linkedEntity = getLinkedEntity(activity);

              return (
                <TableRow 
                  key={activity.id}
                  className={cn(
                    "cursor-pointer",
                    activity.is_completed && "opacity-60"
                  )}
                  onClick={() => onEdit(activity)}
                >
                  {/* Checkbox */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={activity.is_completed}
                      onCheckedChange={(checked) => handleCheckboxChange(activity.id, checked as boolean)}
                      disabled={updatingIds.has(activity.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </TableCell>

                  {/* Assunto (Tipo + Título) */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <TypeIcon className={cn("h-4 w-4 flex-shrink-0", typeConfig.color)} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{typeConfig.label}</TooltipContent>
                      </Tooltip>
                      <span className={cn(
                        "font-medium truncate",
                        activity.is_completed && "line-through text-muted-foreground"
                      )}>
                        {activity.title}
                      </span>
                      {activity.priority === 'high' && !activity.is_completed && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0 flex-shrink-0">
                          Alta
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Criado por */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate">
                      {activity.creator?.full_name || '—'}
                    </span>
                  </TableCell>

                  {/* Pessoa de contato */}
                  <TableCell>
                    {activity.person ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-secondary/80 truncate max-w-[160px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activity.person_id) {
                                navigate(`/people/${activity.person_id}`);
                              }
                            }}
                          >
                            <User className="h-3 w-3 mr-1" />
                            {activity.person.name}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Clique para ver detalhes</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Data de vencimento */}
                  <TableCell>
                    <div className={cn(
                      "flex items-center gap-1.5 text-sm",
                      overdue ? "text-destructive font-medium" : "text-muted-foreground"
                    )}>
                      {overdue && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                      <span>{formattedDate}</span>
                      {formattedTime && (
                        <span className="text-xs opacity-75">{formattedTime}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Organização */}
                  <TableCell>
                    {activity.organization ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-sm font-normal hover:underline text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activity.organization_id) {
                                navigate(`/organizations/${activity.organization_id}`);
                              }
                            }}
                          >
                            <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span className="truncate max-w-[140px]">{activity.organization.name}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clique para ver detalhes</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Telefone */}
                  <TableCell>
                    {activity.person?.phone ? (
                      <a 
                        href={`tel:${activity.person.phone}`}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {activity.person.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* E-mail */}
                  <TableCell>
                    {activity.person?.email ? (
                      <a 
                        href={`mailto:${activity.person.email}`}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline truncate max-w-[160px] block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {activity.person.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Vinculado a (Deal/Pessoa/Org) */}
                  <TableCell>
                    {linkedEntity ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className="cursor-pointer hover:bg-accent truncate max-w-[90px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (linkedEntity.id) {
                                if (linkedEntity.type === 'deal') {
                                  navigate(`/deals/${linkedEntity.id}`);
                                } else if (linkedEntity.type === 'person') {
                                  navigate(`/people/${linkedEntity.id}`);
                                } else if (linkedEntity.type === 'organization') {
                                  navigate(`/organizations/${linkedEntity.id}`);
                                }
                              }
                            }}
                          >
                            <linkedEntity.icon className="h-3 w-3 mr-1" />
                            <span className="truncate">{linkedEntity.type === 'deal' ? 'Negócio' : linkedEntity.type === 'person' ? 'Pessoa' : 'Org'}</span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{linkedEntity.name}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
