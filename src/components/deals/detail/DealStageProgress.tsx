import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Stage {
  id: string;
  name: string;
  color: string | null;
  position: number;
  probability: number | null;
}

interface DealStageProgressProps {
  stages: Stage[];
  currentStageId: string | null;
  onStageClick?: (stageId: string) => void;
  dealStatus?: string;
}

export function DealStageProgress({ 
  stages, 
  currentStageId, 
  onStageClick,
  dealStatus = 'open'
}: DealStageProgressProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStageId);
  const isWon = dealStatus === 'won';
  const isLost = dealStatus === 'lost';

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        {stages.map((stage, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          
          return (
            <Tooltip key={stage.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onStageClick?.(stage.id)}
                  disabled={isWon || isLost}
                  className={cn(
                    'flex-1 relative h-10 flex items-center justify-center',
                    'text-xs font-medium transition-all duration-200',
                    'first:rounded-l-lg last:rounded-r-lg',
                    'border-r border-white/10 last:border-r-0',
                    !isWon && !isLost && 'hover:brightness-110 cursor-pointer',
                    (isWon || isLost) && 'cursor-default'
                  )}
                  style={{
                    backgroundColor: isPast || isCurrent 
                      ? (stage.color || '#6366f1') 
                      : 'hsl(var(--muted))',
                    opacity: isFuture ? 0.5 : 1,
                  }}
                >
                  {isPast && (
                    <Check className="h-4 w-4 text-white mr-1" />
                  )}
                  <span className={cn(
                    'truncate px-2',
                    (isPast || isCurrent) ? 'text-white' : 'text-muted-foreground'
                  )}>
                    {stage.name}
                  </span>
                  {isCurrent && (
                    <div 
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 
                                 border-l-[6px] border-r-[6px] border-t-[6px] 
                                 border-l-transparent border-r-transparent"
                      style={{ borderTopColor: stage.color || '#6366f1' }}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p className="font-medium">{stage.name}</p>
                  <p className="text-muted-foreground">
                    Probabilidade: {stage.probability || 0}%
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {(isWon || isLost) && (
        <div className={cn(
          'mt-3 py-2 px-4 rounded-lg text-center font-medium text-sm',
          isWon && 'bg-green-500/20 text-green-400',
          isLost && 'bg-red-500/20 text-red-400'
        )}>
          {isWon ? '🎉 Negócio Ganho!' : '❌ Negócio Perdido'}
        </div>
      )}
    </div>
  );
}
