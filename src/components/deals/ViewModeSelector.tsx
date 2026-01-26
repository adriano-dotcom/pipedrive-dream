import { LayoutGrid, List, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'kanban' | 'list' | 'forecast';

interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const viewModes = [
  { value: 'kanban' as const, label: 'Kanban', icon: LayoutGrid },
  { value: 'list' as const, label: 'Lista', icon: List },
  // { value: 'forecast' as const, label: 'Previsão', icon: TrendingUp },
];

export function ViewModeSelector({ value, onChange, className }: ViewModeSelectorProps) {
  return (
    <div 
      className={cn(
        "inline-flex p-1 rounded-full ios-glass-subtle",
        className
      )}
    >
      <div className="relative flex">
        {viewModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = value === mode.value;
          
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange(mode.value)}
              className={cn(
                "relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full",
                "transition-all duration-200",
                "ios-press",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={mode.label}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
