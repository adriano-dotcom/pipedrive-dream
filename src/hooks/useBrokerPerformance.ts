import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

export interface BrokerPerformance {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  
  // Métricas de Deals
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  conversionRate: number;
  
  // Valores
  totalWonValue: number;
  totalLostValue: number;
  pipelineValue: number;
  
  // Comissões
  totalCommissionValue: number;
  
  // Atividades
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  activityCompletionRate: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

export function useBrokerPerformance(dateRange: DateRange) {
  return useQuery({
    queryKey: ['broker-performance', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url');

      if (profilesError) throw profilesError;

      // Fetch deals within date range
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('id, owner_id, status, value, commission_value, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (dealsError) throw dealsError;

      // Fetch activities within date range
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, owner_id, is_completed, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (activitiesError) throw activitiesError;

      // Calculate performance for each broker
      const performanceData: BrokerPerformance[] = (profiles || []).map(profile => {
        const userDeals = (deals || []).filter(d => d.owner_id === profile.user_id);
        const userActivities = (activities || []).filter(a => a.owner_id === profile.user_id);

        const wonDeals = userDeals.filter(d => d.status === 'won');
        const lostDeals = userDeals.filter(d => d.status === 'lost');
        const openDeals = userDeals.filter(d => d.status === 'open');

        const finishedDeals = wonDeals.length + lostDeals.length;
        const conversionRate = finishedDeals > 0 
          ? (wonDeals.length / finishedDeals) * 100 
          : 0;

        const totalWonValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
        const totalLostValue = lostDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
        const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
        const totalCommissionValue = wonDeals.reduce((sum, d) => sum + Number(d.commission_value || 0), 0);

        const completedActivities = userActivities.filter(a => a.is_completed).length;
        const pendingActivities = userActivities.filter(a => !a.is_completed).length;
        const activityCompletionRate = userActivities.length > 0
          ? (completedActivities / userActivities.length) * 100
          : 0;

        return {
          userId: profile.user_id,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          totalDeals: userDeals.length,
          wonDeals: wonDeals.length,
          lostDeals: lostDeals.length,
          openDeals: openDeals.length,
          conversionRate,
          totalWonValue,
          totalLostValue,
          pipelineValue,
          totalCommissionValue,
          totalActivities: userActivities.length,
          completedActivities,
          pendingActivities,
          activityCompletionRate,
        };
      });

      // Sort by total won value (default ranking)
      return performanceData.sort((a, b) => b.totalWonValue - a.totalWonValue);
    },
    enabled: !!dateRange.from && !!dateRange.to,
  });
}
