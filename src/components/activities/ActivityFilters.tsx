import { 
  CheckSquare, 
  Phone, 
  Calendar, 
  Mail, 
  Clock,
  AlertCircle,
  CalendarDays,
  CalendarRange,
  ListTodo,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type TimeFilter = 'overdue' | 'today' | 'week' | 'all' | 'completed';
export type TypeFilter = 'all' | 'task' | 'call' | 'meeting' | 'email' | 'deadline';

interface ActivityFiltersProps {
  timeFilter: TimeFilter;
  typeFilter: TypeFilter;
  searchQuery: string;
  counts: {
    overdue: number;
    today: number;
    week: number;
    all: number;
    completed: number;
  };
  onTimeFilterChange: (filter: TimeFilter) => void;
  onTypeFilterChange: (filter: TypeFilter) => void;
  onSearchChange: (query: string) => void;
}

const timeFilterConfig: Record<TimeFilter, { label: string; icon: React.ElementType }> = {
  overdue: { label: 'Vencidas', icon: AlertCircle },
  today: { label: 'Hoje', icon: CalendarDays },
  week: { label: 'Esta Semana', icon: CalendarRange },
  all: { label: 'Todas', icon: ListTodo },
  completed: { label: 'Concluídas', icon: CheckCircle2 },
};

const typeOptions = [
  { value: 'all', label: 'Todos os tipos', icon: ListTodo },
  { value: 'task', label: 'Tarefas', icon: CheckSquare },
  { value: 'call', label: 'Ligações', icon: Phone },
  { value: 'meeting', label: 'Reuniões', icon: Calendar },
  { value: 'email', label: 'Emails', icon: Mail },
  { value: 'deadline', label: 'Prazos', icon: Clock },
];

export function ActivityFilters({
  timeFilter,
  typeFilter,
  searchQuery,
  counts,
  onTimeFilterChange,
  onTypeFilterChange,
  onSearchChange,
}: ActivityFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Time Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(timeFilterConfig) as TimeFilter[]).map((filter) => {
          const config = timeFilterConfig[filter];
          const Icon = config.icon;
          const count = counts[filter];
          const isActive = timeFilter === filter;
          
          return (
            <Button
              key={filter}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeFilterChange(filter)}
              className={cn(
                "gap-2",
                filter === 'overdue' && count > 0 && !isActive && "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {config.label}
              {count > 0 && (
                <Badge 
                  variant={isActive ? "secondary" : "outline"} 
                  className={cn(
                    "ml-1 px-1.5 py-0 text-xs",
                    filter === 'overdue' && count > 0 && !isActive && "border-destructive text-destructive"
                  )}
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
      
      {/* Secondary Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as TypeFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de atividade" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        
        <div className="flex-1 min-w-[200px] max-w-md">
          <Input
            placeholder="Buscar atividades..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
