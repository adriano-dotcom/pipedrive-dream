import { useMemo, useState } from 'react';
import { format, isToday, startOfWeek, endOfWeek, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Plus, Inbox, List, LayoutGrid } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ActivityCard } from './ActivityCard';
import { ActivityFilters, TimeFilter, TypeFilter } from './ActivityFilters';
import { ActivityFormSheet } from './ActivityFormSheet';
import { ActivitiesTable, Activity } from './ActivitiesTable';

type ViewMode = 'table' | 'cards';

export function ActivityList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Fetch all activities with expanded relations
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          deal:deals(id, title),
          person:people(id, name, phone, email),
          organization:organizations(id, name)
        `)
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true, nullsFirst: false })
        .limit(200);

      if (error) throw error;
      
      // Fetch creator names separately
      const creatorIds = [...new Set(data.map(a => a.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      return data.map(activity => ({
        ...activity,
        creator: activity.created_by ? { full_name: profileMap.get(activity.created_by) || '' } : null
      })) as Activity[];
    },
  });

  // Toggle activity completion
  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('activities')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a atividade.',
        variant: 'destructive',
      });
    },
  });

  // Calculate counts and filter activities
  const { filteredActivities, counts } = useMemo(() => {
    if (!activities) return { filteredActivities: [], counts: { overdue: 0, today: 0, week: 0, all: 0, completed: 0 } };

    const today = startOfDay(new Date());
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    // Calculate counts
    const counts = {
      overdue: activities.filter(a => !a.is_completed && isBefore(parseISO(a.due_date), today)).length,
      today: activities.filter(a => !a.is_completed && isToday(parseISO(a.due_date))).length,
      week: activities.filter(a => {
        const dueDate = parseISO(a.due_date);
        return !a.is_completed && 
          !isBefore(dueDate, today) && 
          !isBefore(dueDate, weekStart) && 
          !isAfter(dueDate, weekEnd);
      }).length,
      all: activities.filter(a => !a.is_completed).length,
      completed: activities.filter(a => a.is_completed).length,
    };

    // Apply time filter
    let filtered = activities.filter(a => {
      const dueDate = parseISO(a.due_date);
      
      switch (timeFilter) {
        case 'overdue':
          return !a.is_completed && isBefore(dueDate, today);
        case 'today':
          return !a.is_completed && isToday(dueDate);
        case 'week':
          return !a.is_completed && !isBefore(dueDate, today) && !isBefore(dueDate, weekStart) && !isAfter(dueDate, weekEnd);
        case 'completed':
          return a.is_completed;
        case 'all':
        default:
          return !a.is_completed;
      }
    });

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.activity_type === typeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.deal?.title?.toLowerCase().includes(query) ||
        a.person?.name?.toLowerCase().includes(query) ||
        a.organization?.name?.toLowerCase().includes(query)
      );
    }

    return { filteredActivities: filtered, counts };
  }, [activities, timeFilter, typeFilter, searchQuery]);

  // Group activities by date (for cards view)
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    
    filteredActivities.forEach(activity => {
      const dateKey = activity.due_date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredActivities]);

  const handleToggleComplete = (id: string, completed: boolean) => {
    toggleCompleteMutation.mutate({ id, completed });
  };

  const handleOpenActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const handleNewActivity = () => {
    setEditingActivity(null);
    setFormOpen(true);
  };

  const formatGroupDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <ActivityFilters
            timeFilter={timeFilter}
            typeFilter={typeFilter}
            searchQuery={searchQuery}
            counts={counts}
            onTimeFilterChange={setTimeFilter}
            onTypeFilterChange={setTypeFilter}
            onSearchChange={setSearchQuery}
          />
          <div className="flex items-center gap-3 ml-4">
            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              className="bg-muted/50 p-1 rounded-lg"
            >
              <ToggleGroupItem 
                value="table" 
                aria-label="Visualização em tabela"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="cards" 
                aria-label="Visualização em cards"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            <Button onClick={handleNewActivity} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Atividade
            </Button>
          </div>
        </div>
      </div>

      {/* Activities content */}
      {filteredActivities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma atividade encontrada</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {timeFilter === 'completed' 
                ? 'Você ainda não concluiu nenhuma atividade.'
                : 'Não há atividades pendentes para este filtro.'}
            </p>
            <Button onClick={handleNewActivity} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira atividade
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <ActivitiesTable
          activities={filteredActivities}
          onToggleComplete={handleToggleComplete}
          onEdit={handleOpenActivity}
        />
      ) : (
        <div className="space-y-6">
          {groupedActivities.map(([dateKey, dayActivities]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
                {formatGroupDate(dateKey)}
              </h3>
              <div className="space-y-2">
                {dayActivities.map(activity => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onToggleComplete={handleToggleComplete}
                    onClick={() => handleOpenActivity(activity)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Sheet */}
      <ActivityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        activity={editingActivity}
      />
    </div>
  );
}
