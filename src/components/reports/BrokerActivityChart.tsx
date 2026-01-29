import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ListTodo } from 'lucide-react';
import { BrokerPerformance } from '@/hooks/useBrokerPerformance';

interface BrokerActivityChartProps {
  data: BrokerPerformance[] | undefined;
  isLoading: boolean;
}

export function BrokerActivityChart({ data, isLoading }: BrokerActivityChartProps) {
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
    .filter(b => b.totalActivities > 0)
    .slice(0, 5)
    .map(broker => ({
      name: broker.fullName.split(' ')[0],
      fullName: broker.fullName,
      completadas: broker.completedActivities,
      pendentes: broker.pendingActivities,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const broker = chartData.find(b => b.name === label);
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-medium">{broker?.fullName}</p>
          <div className="mt-1 space-y-1 text-sm">
            <p className="text-green-600">
              Completadas: {payload[0]?.value || 0}
            </p>
            <p className="text-amber-600">
              Pendentes: {payload[1]?.value || 0}
            </p>
          </div>
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
            <ListTodo className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Atividades por Corretor</CardTitle>
            <CardDescription>Completadas vs Pendentes</CardDescription>
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
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
              />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="completadas"
                name="Completadas"
                fill="hsl(142, 71%, 45%)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="pendentes"
                name="Pendentes"
                fill="hsl(45, 93%, 47%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
