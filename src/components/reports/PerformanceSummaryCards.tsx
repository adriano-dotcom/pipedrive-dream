import { Trophy, TrendingUp, Target, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { BrokerPerformance } from '@/hooks/useBrokerPerformance';

interface PerformanceSummaryCardsProps {
  data: BrokerPerformance[] | undefined;
  isLoading: boolean;
}

export function PerformanceSummaryCards({ data, isLoading }: PerformanceSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const topPerformer = data?.[0];
  const totalWonValue = data?.reduce((sum, b) => sum + b.totalWonValue, 0) || 0;
  const totalWonDeals = data?.reduce((sum, b) => sum + b.wonDeals, 0) || 0;
  const totalLostDeals = data?.reduce((sum, b) => sum + b.lostDeals, 0) || 0;
  const finishedDeals = totalWonDeals + totalLostDeals;
  const avgConversionRate = finishedDeals > 0 ? (totalWonDeals / finishedDeals) * 100 : 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: value >= 1000000 ? 'compact' : 'standard',
      maximumFractionDigits: value >= 1000000 ? 1 : 0,
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Top Performer */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top Performer
          </CardTitle>
          <Trophy className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          {topPerformer ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={topPerformer.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(topPerformer.fullName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-bold">{topPerformer.fullName}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(topPerformer.totalWonValue)} em vendas
                </p>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Sem dados</div>
          )}
        </CardContent>
      </Card>

      {/* Valor Total Ganho */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Valor Total Ganho
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalWonValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalWonDeals} negócios fechados
          </p>
        </CardContent>
      </Card>

      {/* Total de Negócios */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Negócios
          </CardTitle>
          <Target className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{finishedDeals}</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600">{totalWonDeals} ganhos</span>
            {' / '}
            <span className="text-destructive">{totalLostDeals} perdidos</span>
          </p>
        </CardContent>
      </Card>

      {/* Taxa Média de Conversão */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Taxa Média Conversão
          </CardTitle>
          <Percent className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {avgConversionRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            da equipe geral
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
