import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StageData {
  name: string;
  color: string;
  value: number;
}

interface StageValueChartProps {
  data: StageData[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

export function StageValueChart({ data, loading }: StageValueChartProps) {
  const chartConfig: ChartConfig = data.reduce((acc, stage) => ({
    ...acc,
    [stage.name]: {
      label: stage.name,
      color: stage.color,
    },
  }), {} as ChartConfig);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg">Valor por Etapa</CardTitle>
              <CardDescription>Total em cada fase</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground gap-3">
            <DollarSign className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum valor registrado ainda</p>
            <a href="/deals" className="text-sm text-primary hover:underline">
              Criar primeiro negócio →
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
            <DollarSign className="h-5 w-5 text-success" />
          </div>
          <div>
            <CardTitle className="text-lg">Valor por Etapa</CardTitle>
            <CardDescription>Total em cada fase</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={100}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value) => (
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <Bar 
              dataKey="value" 
              radius={[0, 4, 4, 0]}
              maxBarSize={40}
              isAnimationActive={false}
              label={{
                position: 'right',
                formatter: (value: number) => formatCurrency(value),
                fontSize: 11,
                fill: 'hsl(var(--muted-foreground))',
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
