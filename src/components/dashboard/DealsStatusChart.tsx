import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatusData {
  open: number;
  won: number;
  lost: number;
}

interface DealsStatusChartProps {
  data: StatusData | null;
  loading?: boolean;
}

const COLORS = {
  open: 'hsl(217, 91%, 60%)',
  won: 'hsl(142, 71%, 45%)',
  lost: 'hsl(0, 84%, 60%)',
};

const LABELS = {
  open: 'Abertos',
  won: 'Ganhos',
  lost: 'Perdidos',
};

const chartConfig: ChartConfig = {
  open: {
    label: 'Abertos',
    color: COLORS.open,
  },
  won: {
    label: 'Ganhos',
    color: COLORS.won,
  },
  lost: {
    label: 'Perdidos',
    color: COLORS.lost,
  },
};

export function DealsStatusChart({ data, loading }: DealsStatusChartProps) {
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

  const pieData = data ? [
    { name: 'open', value: data.open, label: LABELS.open },
    { name: 'won', value: data.won, label: LABELS.won },
    { name: 'lost', value: data.lost, label: LABELS.lost },
  ].filter(item => item.value > 0) : [];

  const total = (data?.open || 0) + (data?.won || 0) + (data?.lost || 0);

  if (pieData.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <PieChartIcon className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Status dos Negócios</CardTitle>
              <CardDescription>Distribuição por resultado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Nenhum negócio cadastrado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <PieChartIcon className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Status dos Negócios</CardTitle>
            <CardDescription>Distribuição por resultado</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
            >
              {pieData.map((entry) => (
                <Cell 
                  key={`cell-${entry.name}`} 
                  fill={COLORS[entry.name as keyof typeof COLORS]} 
                />
              ))}
            </Pie>
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name) => (
                    <span className="font-medium">{value} negócio(s)</span>
                  )}
                />
              }
            />
          </PieChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
          {data && data.open > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.open }} />
              <span className="text-muted-foreground">Abertos</span>
              <span className="font-medium">{data.open}</span>
            </div>
          )}
          {data && data.won > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.won }} />
              <span className="text-muted-foreground">Ganhos</span>
              <span className="font-medium">{data.won}</span>
            </div>
          )}
          {data && data.lost > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.lost }} />
              <span className="text-muted-foreground">Perdidos</span>
              <span className="font-medium">{data.lost}</span>
            </div>
          )}
        </div>
        <div className="text-center mt-2 text-xs text-muted-foreground">
          Total: {total} negócio(s)
        </div>
      </CardContent>
    </Card>
  );
}
