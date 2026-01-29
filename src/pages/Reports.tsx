import { useState } from 'react';
import { subDays } from 'date-fns';
import { BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PerformanceFilters } from '@/components/reports/PerformanceFilters';
import { PerformanceSummaryCards } from '@/components/reports/PerformanceSummaryCards';
import { BrokerRankingTable } from '@/components/reports/BrokerRankingTable';
import { BrokerPerformanceChart } from '@/components/reports/BrokerPerformanceChart';
import { BrokerActivityChart } from '@/components/reports/BrokerActivityChart';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { useBrokerPerformance, BrokerPerformance } from '@/hooks/useBrokerPerformance';
import { ExportColumn } from '@/lib/export';

interface DateRange {
  from: Date;
  to: Date;
}

const exportColumns: ExportColumn[] = [
  { id: 'fullName', label: 'Corretor', accessor: (r: BrokerPerformance) => r.fullName },
  { id: 'totalDeals', label: 'Total Deals', accessor: (r: BrokerPerformance) => r.totalDeals },
  { id: 'wonDeals', label: 'Ganhos', accessor: (r: BrokerPerformance) => r.wonDeals },
  { id: 'lostDeals', label: 'Perdidos', accessor: (r: BrokerPerformance) => r.lostDeals },
  { id: 'conversionRate', label: 'Taxa Conversão (%)', accessor: (r: BrokerPerformance) => Number(r.conversionRate.toFixed(1)) },
  { id: 'totalWonValue', label: 'Valor Ganho (R$)', accessor: (r: BrokerPerformance) => r.totalWonValue },
  { id: 'totalCommissionValue', label: 'Comissão (R$)', accessor: (r: BrokerPerformance) => r.totalCommissionValue },
  { id: 'pipelineValue', label: 'Pipeline (R$)', accessor: (r: BrokerPerformance) => r.pipelineValue },
];

export default function Reports() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(today, 30),
    to: today,
  });

  const { data, isLoading } = useBrokerPerformance(dateRange);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Relatórios de Performance</h1>
              <p className="text-sm text-muted-foreground">
                Ranking e métricas de conversão por corretor
              </p>
            </div>
          </div>
          
          <ExportButtons
            data={data || []}
            columns={exportColumns}
            filenamePrefix="relatorio_performance"
            disabled={isLoading || !data?.length}
          />
        </div>

        {/* Filters */}
        <PerformanceFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        {/* Summary Cards */}
        <PerformanceSummaryCards data={data} isLoading={isLoading} />

        {/* Ranking Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="text-lg">Ranking de Corretores</CardTitle>
            <CardDescription>
              Clique nas colunas para ordenar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <BrokerRankingTable data={data} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BrokerPerformanceChart data={data} isLoading={isLoading} />
          <BrokerActivityChart data={data} isLoading={isLoading} />
        </div>
      </div>
    </AppLayout>
  );
}
