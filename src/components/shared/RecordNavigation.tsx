import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type EntityType = 'people' | 'organizations' | 'deals';

interface RecordNavigationProps {
  entityType: EntityType;
  currentId: string;
}

interface RecordItem {
  id: string;
  displayName: string;
}

export function RecordNavigation({ entityType, currentId }: RecordNavigationProps) {
  const navigate = useNavigate();

  // Fetch all IDs for the entity type (ordered)
  const { data: allRecords = [], isLoading } = useQuery({
    queryKey: [`${entityType}-ids-for-navigation`],
    queryFn: async (): Promise<RecordItem[]> => {
      if (entityType === 'people') {
        const { data, error } = await supabase
          .from('people')
          .select('id, name')
          .order('name');
        if (error) throw error;
        return (data || []).map(r => ({ id: r.id, displayName: r.name }));
      } 
      
      if (entityType === 'organizations') {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name')
          .order('name');
        if (error) throw error;
        return (data || []).map(r => ({ id: r.id, displayName: r.name }));
      }
      
      // deals
      const { data, error } = await supabase
        .from('deals')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(r => ({ id: r.id, displayName: r.title }));
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const routeMap: Record<EntityType, string> = {
    people: '/people',
    organizations: '/organizations',
    deals: '/deals',
  };

  // Find current position
  const currentIndex = allRecords.findIndex(r => r.id === currentId);
  const totalRecords = allRecords.length;

  // Get prev/next records
  const prevRecord = currentIndex > 0 ? allRecords[currentIndex - 1] : null;
  const nextRecord = currentIndex < totalRecords - 1 ? allRecords[currentIndex + 1] : null;

  const handleNavigate = (id: string) => {
    navigate(`${routeMap[entityType]}/${id}`);
  };

  if (isLoading || totalRecords === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => prevRecord && handleNavigate(prevRecord.id)}
              disabled={!prevRecord}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {prevRecord ? (
              <span>Anterior: {prevRecord.displayName}</span>
            ) : (
              <span>Primeiro registro</span>
            )}
          </TooltipContent>
        </Tooltip>

        <span className="text-sm text-muted-foreground tabular-nums min-w-[60px] text-center">
          {currentIndex + 1} / {totalRecords}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => nextRecord && handleNavigate(nextRecord.id)}
              disabled={!nextRecord}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {nextRecord ? (
              <span>Próximo: {nextRecord.displayName}</span>
            ) : (
              <span>Último registro</span>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
