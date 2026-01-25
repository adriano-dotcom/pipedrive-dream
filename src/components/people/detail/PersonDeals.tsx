import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  Trophy, 
  XCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PersonDeal } from '@/hooks/usePersonDetails';

interface PersonDealsProps {
  deals: PersonDeal[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'won':
      return <Trophy className="h-4 w-4 text-green-500" />;
    case 'lost':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-blue-500" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'won':
      return 'Ganho';
    case 'lost':
      return 'Perdido';
    default:
      return 'Em andamento';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'won':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'lost':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  }
};

export function PersonDeals({ deals }: PersonDealsProps) {
  const openDeals = deals.filter(d => d.status === 'open');
  const wonDeals = deals.filter(d => d.status === 'won');

  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  if (deals.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">Nenhum negócio</h3>
          <p className="text-sm text-muted-foreground">
            Crie negócios vinculados a esta pessoa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass border-border/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{deals.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-blue-500">{openDeals.length}</p>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-green-500">{wonDeals.length}</p>
            <p className="text-xs text-muted-foreground">Ganhos</p>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL',
                notation: 'compact',
              }).format(wonValue)}
            </p>
            <p className="text-xs text-muted-foreground">Valor Ganho</p>
          </CardContent>
        </Card>
      </div>

      {/* Deals List */}
      <div className="space-y-2">
        {deals.map((deal) => (
          <Link key={deal.id} to={`/deals/${deal.id}`}>
            <Card className="glass border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(deal.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm group-hover:text-primary transition-colors">
                        {deal.title}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusColor(deal.status)}`}
                      >
                        {getStatusLabel(deal.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {deal.pipeline && <span>{deal.pipeline.name}</span>}
                      {deal.stage && (
                        <>
                          <span>•</span>
                          <span 
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{ 
                              backgroundColor: `${deal.stage.color}20`,
                              color: deal.stage.color || undefined,
                            }}
                          >
                            {deal.stage.name}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>{format(new Date(deal.created_at), 'dd/MM/yy', { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {deal.value && deal.value > 0 && (
                      <span className="font-medium text-sm">
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL',
                        }).format(deal.value)}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
