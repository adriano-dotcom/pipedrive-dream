import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, Users, Briefcase, CheckSquare, TrendingUp, Clock, ArrowUpRight, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, parseISO, isBefore, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  trend?: string;
  href?: string;
  variant?: 'default' | 'warning' | 'success';
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, href, variant = 'default', loading }: StatCardProps) {
  const content = (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover-lift",
      variant === 'warning' && "border-warning/30 bg-warning/5",
      variant === 'success' && "border-success/30 bg-success/5"
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
          variant === 'default' && "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
          variant === 'warning' && "bg-warning/10 text-warning group-hover:bg-warning group-hover:text-warning-foreground",
          variant === 'success' && "bg-success/10 text-success group-hover:bg-success group-hover:text-success-foreground"
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        {loading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{value}</span>
              {trend && (
                <Badge variant="secondary" className="text-xs bg-success/10 text-success border-0">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  {trend}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </>
        )}
      </CardContent>
      
      {href && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </Card>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return content;
}

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
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
            </h1>
            <span className="text-3xl">👋</span>
          </div>
          <p className="text-muted-foreground">
            Bem-vindo ao CRM Jacometo. Aqui está um resumo do seu dia.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
          <StatCard
            title="Organizações"
            value={stats?.organizations || 0}
            subtitle="empresas cadastradas"
            icon={Building2}
            href="/organizations"
            loading={statsLoading}
          />
          <StatCard
            title="Pessoas"
            value={stats?.people || 0}
            subtitle="contatos cadastrados"
            icon={Users}
            href="/people"
            loading={statsLoading}
          />
          <StatCard
            title="Negócios"
            value={stats?.deals || 0}
            subtitle="em andamento"
            icon={Briefcase}
            href="/deals"
            loading={statsLoading}
          />
          <StatCard
            title="Atividades"
            value={(activitiesStats?.overdue || 0) + (activitiesStats?.today || 0)}
            subtitle={activitiesStats?.overdue ? `${activitiesStats.overdue} vencidas` : 'pendentes hoje'}
            icon={CheckSquare}
            href="/activities"
            variant={activitiesStats?.overdue && activitiesStats.overdue > 0 ? 'warning' : 'default'}
            loading={activitiesLoading}
          />
        </div>

        {/* Upcoming Activities */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Próximas Atividades</CardTitle>
                  <CardDescription>Atividades pendentes para hoje e vencidas</CardDescription>
                </div>
              </div>
              <Link 
                to="/activities"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Ver todas
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activitiesLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : activitiesStats?.upcoming && activitiesStats.upcoming.length > 0 ? (
              <div className="divide-y divide-border/50">
                {activitiesStats.upcoming.map((activity, index) => {
                  const isOverdue = isBefore(parseISO(activity.due_date), startOfDay(new Date()));
                  return (
                    <Link 
                      key={activity.id}
                      to="/activities"
                      className={cn(
                        "flex items-center justify-between p-4 hover:bg-muted/30 transition-colors",
                        isOverdue && "bg-destructive/5"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          isOverdue ? "bg-destructive/10 text-destructive" : "bg-muted"
                        )}>
                          <CheckSquare className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{activity.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">Vencida</Badge>
                        )}
                        {activity.due_time && (
                          <span className="text-sm text-muted-foreground font-mono">
                            {activity.due_time.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mx-auto mb-3">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <p className="font-medium">Nenhuma atividade pendente</p>
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

        {/* Quick Actions */}
        <Card className="border-dashed border-border/50 bg-gradient-to-br from-muted/20 to-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse-soft" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Comece a usar seu CRM</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Adicione sua primeira organização ou pessoa para começar a gerenciar seus contatos e negócios.
            </p>
            <div className="flex gap-3">
              <Link
                to="/organizations"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-0.5 shadow-lg shadow-primary/20"
              >
                <Building2 className="mr-2 h-4 w-4" />
                Nova Organização
              </Link>
              <Link
                to="/people"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all hover:-translate-y-0.5"
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
            Você está logado como <Badge variant="outline" className="ml-1 text-xs">Administrador</Badge>
          </p>
        )}
    </div>
  );
}
