import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, Users, Briefcase, CheckSquare, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, parseISO, isBefore, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [orgsResult, peopleResult, dealsResult] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('people').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      return {
        organizations: orgsResult.count || 0,
        people: peopleResult.count || 0,
        deals: dealsResult.count || 0,
      };
    },
  });

  // Fetch activities stats
  const { data: activitiesStats, isLoading: activitiesLoading } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data: activities, error } = await supabase
        .from('activities')
        .select('id, title, due_date, due_time, activity_type, is_completed')
        .eq('is_completed', false)
        .lte('due_date', today)
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true, nullsFirst: false })
        .limit(5);

      if (error) throw error;

      const todayStart = startOfDay(new Date());
      const overdue = activities?.filter(a => isBefore(parseISO(a.due_date), todayStart)).length || 0;
      const todayCount = activities?.filter(a => isToday(parseISO(a.due_date))).length || 0;

      return {
        overdue,
        today: todayCount,
        upcoming: activities || [],
      };
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao CRM Jacometo. Aqui está um resumo do seu dia.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organizações
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.organizations || 0}</div>
                <p className="text-xs text-muted-foreground">empresas cadastradas</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pessoas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.people || 0}</div>
                <p className="text-xs text-muted-foreground">contatos cadastrados</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Negócios
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.deals || 0}</div>
                <p className="text-xs text-muted-foreground">em andamento</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn(
          activitiesStats?.overdue && activitiesStats.overdue > 0 && "border-destructive"
        )}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atividades
            </CardTitle>
            <CheckSquare className={cn(
              "h-4 w-4",
              activitiesStats?.overdue && activitiesStats.overdue > 0 
                ? "text-destructive" 
                : "text-muted-foreground"
            )} />
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(activitiesStats?.overdue || 0) + (activitiesStats?.today || 0)}
                </div>
                <div className="flex gap-2 text-xs mt-1">
                  {activitiesStats?.overdue && activitiesStats.overdue > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {activitiesStats.overdue} vencidas
                    </Badge>
                  ) : (
                    <p className="text-muted-foreground">pendentes hoje</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Próximas Atividades
          </CardTitle>
          <CardDescription>Atividades pendentes para hoje e vencidas</CardDescription>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : activitiesStats?.upcoming && activitiesStats.upcoming.length > 0 ? (
            <div className="space-y-2">
              {activitiesStats.upcoming.map((activity) => {
                const isOverdue = isBefore(parseISO(activity.due_date), startOfDay(new Date()));
                return (
                  <Link 
                    key={activity.id}
                    to="/activities"
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors",
                      isOverdue && "border-destructive/50 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CheckSquare className={cn(
                        "h-4 w-4",
                        isOverdue ? "text-destructive" : "text-muted-foreground"
                      )} />
                      <span className="font-medium">{activity.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">Vencida</Badge>
                      )}
                      {activity.due_time && (
                        <span className="text-sm text-muted-foreground">
                          {activity.due_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
              <Link 
                to="/activities"
                className="block text-center text-sm text-primary hover:underline mt-4"
              >
                Ver todas as atividades →
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma atividade pendente</p>
              <Link 
                to="/activities"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Criar atividade
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions / Empty State */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Comece a usar seu CRM</h3>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            Adicione sua primeira organização ou pessoa para começar a gerenciar seus contatos e negócios.
          </p>
          <div className="flex gap-3">
            <Link
              to="/organizations"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Nova Organização
            </Link>
            <Link
              to="/people"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <Users className="mr-2 h-4 w-4" />
              Nova Pessoa
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Admin Badge */}
      {isAdmin && (
        <p className="text-xs text-muted-foreground text-center">
          Você está logado como <span className="font-medium">Administrador</span>
        </p>
      )}
    </div>
  );
}
