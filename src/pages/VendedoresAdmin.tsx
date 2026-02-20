import { Navigate } from 'react-router-dom';
import { Shield, User, Users, UserX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVendedores } from '@/hooks/useVendedores';
import { VendedoresTable } from '@/components/vendedores/VendedoresTable';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VendedoresAdmin() {
  const { isAdmin } = useAuth();
  const { data: vendedores, isLoading, error } = useVendedores();

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const stats = vendedores ? {
    total: vendedores.length,
    admins: vendedores.filter(v => v.role === 'admin').length,
    corretores: vendedores.filter(v => v.role === 'corretor').length,
    inativos: vendedores.filter(v => !v.is_active).length,
  } : { total: 0, admins: 0, corretores: 0, inativos: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão de Vendedores</h1>
        <p className="text-muted-foreground">
          Gerencie a equipe de corretores do sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{isLoading ? '—' : stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                <Shield className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{isLoading ? '—' : stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <User className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Corretores</p>
                <p className="text-2xl font-bold">{isLoading ? '—' : stats.corretores}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <UserX className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold">{isLoading ? '—' : stats.inativos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar vendedores: {(error as Error).message}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {/* Table */}
      {!isLoading && vendedores && (
        <VendedoresTable vendedores={vendedores} />
      )}

      {/* Info Box */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
              <Shield className="h-4 w-4 text-blue-500" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Como funciona</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Vendedores podem se cadastrar em <code className="bg-muted px-1 rounded">/auth</code></li>
                <li>• Novos cadastros recebem automaticamente a role "Corretor"</li>
                <li>• Aqui você pode promover para Admin ou editar informações</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
