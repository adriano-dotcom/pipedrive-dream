import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PipelineFunnelChart } from './PipelineFunnelChart';
import { StageValueChart } from './StageValueChart';
import { ForecastChart } from './ForecastChart';
import { DealsStatusChart } from './DealsStatusChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { format, parseISO, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pipeline {
  id: string;
  name: string;
  is_default: boolean | null;
}

export function DashboardCharts() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');

  // Fetch pipelines
  const { data: pipelines } = useQuery({
    queryKey: ['dashboard-pipelines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name, is_default')
        .order('name');
      
      if (error) throw error;
      return data as Pipeline[];
    },
  });

  // Set default pipeline when data loads
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);

  // Fetch pipeline data (stages with deals)
  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ['dashboard-pipeline-data', selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];

      const { data: stages, error } = await supabase
        .from('stages')
        .select('id, name, color, position, probability')
        .eq('pipeline_id', selectedPipelineId)
        .order('position');

      if (error) throw error;

      // Fetch deals for each stage
      const { data: deals } = await supabase
        .from('deals')
        .select('id, value, status, stage_id')
        .eq('pipeline_id', selectedPipelineId);

      return stages?.map(stage => {
        const stageDeals = deals?.filter(d => d.stage_id === stage.id && d.status === 'open') || [];
        return {
          name: stage.name,
          color: stage.color || '#6366f1',
          count: stageDeals.length,
          value: stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0),
          weightedValue: stageDeals.reduce((sum, d) => sum + (Number(d.value || 0) * (stage.probability || 0) / 100), 0),
        };
      }) || [];
    },
    enabled: !!selectedPipelineId,
  });

  // Fetch deals status data
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['dashboard-status-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('status');

      if (error) throw error;

      return {
        open: data?.filter(d => d.status === 'open').length || 0,
        won: data?.filter(d => d.status === 'won').length || 0,
        lost: data?.filter(d => d.status === 'lost').length || 0,
      };
    },
  });

  // Fetch forecast data
  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ['dashboard-forecast-data'],
    queryFn: async () => {
      const { data: deals, error } = await supabase
        .from('deals')
        .select('id, value, expected_close_date, created_at, stage_id')
        .eq('status', 'open');

      if (error) throw error;

      // Fetch stages for probability
      const { data: stages } = await supabase
        .from('stages')
        .select('id, probability');

      const stageProb = new Map(stages?.map(s => [s.id, s.probability || 0]) || []);

      // Group by month (next 6 months)
      const monthsData: Record<string, { totalValue: number; weightedValue: number }> = {};
      
      // Initialize next 6 months
      for (let i = 0; i < 6; i++) {
        const date = addMonths(startOfMonth(new Date()), i);
        const monthKey = format(date, 'MMM/yy', { locale: ptBR });
        monthsData[monthKey] = { totalValue: 0, weightedValue: 0 };
      }

      // Fill with deal data
      deals?.forEach(deal => {
        const dateStr = deal.expected_close_date || deal.created_at;
        if (!dateStr) return;

        const date = parseISO(dateStr);
        const monthKey = format(date, 'MMM/yy', { locale: ptBR });
        
        if (monthsData[monthKey]) {
          const value = Number(deal.value || 0);
          const probability = stageProb.get(deal.stage_id) || 0;
          
          monthsData[monthKey].totalValue += value;
          monthsData[monthKey].weightedValue += value * probability / 100;
        }
      });

      return Object.entries(monthsData).map(([month, values]) => ({
        month,
        totalValue: values.totalValue,
        weightedValue: values.weightedValue,
      }));
    },
  });

  return (
    <div className="space-y-6">
      {/* Pipeline Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">Pipeline:</span>
        <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione um pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines?.map(pipeline => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineFunnelChart data={pipelineData || []} loading={pipelineLoading} />
        <StageValueChart data={pipelineData || []} loading={pipelineLoading} />
        <ForecastChart data={forecastData || []} loading={forecastLoading} />
        <DealsStatusChart data={statusData || null} loading={statusLoading} />
      </div>
    </div>
  );
}
