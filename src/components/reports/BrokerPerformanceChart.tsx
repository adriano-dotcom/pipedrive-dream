import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { BrokerPerformance } from '@/hooks/useBrokerPerformance';

interface BrokerPerformanceChartProps {
  data: BrokerPerformance[] | undefined;
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(217, 91%, 60%)',
  'hsl(217, 91%, 65%)',
  'hsl(217, 91%, 70%)',
  'hsl(217, 91%, 75%)',
];

export function BrokerPerformanceChart({ data, isLoading }: BrokerPerformanceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (data || [])
    .filter(b => b.totalWonValue > 0)
    .slice(0, 5)
    .map(broker => ({
      name: broker.fullName.split(' ')[0],
      fullName: broker.fullName,
      value: broker.totalWonValue,
    }));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-medium">{payload[0].payload.fullName}</p>
          <p className="text-sm text-green-600 font-semibold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Valor por Corretor</CardTitle>
            <CardDescription>Top 5 em vendas fechadas</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={formatCurrency}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
