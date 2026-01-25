import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Briefcase, CheckSquare, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [orgsResult, peopleResult] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('people').select('id', { count: 'exact', head: true }),
      ]);

      return {
        organizations: orgsResult.count || 0,
        people: peopleResult.count || 0,
        deals: 0, // Will be added in Phase 3
        activities: 0, // Will be added in Phase 4
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
            <div className="text-2xl font-bold">{stats?.organizations || 0}</div>
            <p className="text-xs text-muted-foreground">empresas cadastradas</p>
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
            <div className="text-2xl font-bold">{stats?.people || 0}</div>
            <p className="text-xs text-muted-foreground">contatos cadastrados</p>
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
            <div className="text-2xl font-bold">{stats?.deals || 0}</div>
            <p className="text-xs text-muted-foreground">em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atividades
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activities || 0}</div>
            <p className="text-xs text-muted-foreground">pendentes hoje</p>
          </CardContent>
        </Card>
      </div>

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
            <a
              href="/organizations"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Nova Organização
            </a>
            <a
              href="/people"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <Users className="mr-2 h-4 w-4" />
              Nova Pessoa
            </a>
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
