import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileCard({ children, onClick, className }: MobileCardProps) {
  return (
    <div 
      className={cn(
        "ios-glass p-4 rounded-xl space-y-2",
        onClick && "cursor-pointer active:scale-[0.98] transition-transform",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface MobileCardRowProps {
  icon?: ReactNode;
  label?: string;
  value: ReactNode;
  className?: string;
}

export function MobileCardRow({ icon, label, value, className }: MobileCardRowProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {icon && <span className="text-muted-foreground flex-shrink-0">{icon}</span>}
      {label && <span className="text-muted-foreground">{label}:</span>}
      <span className="truncate">{value}</span>
    </div>
  );
}

interface MobileCardActionsProps {
  children: ReactNode;
}

export function MobileCardActions({ children }: MobileCardActionsProps) {
  return (
    <div className="flex items-center gap-2 pt-2 border-t border-border/30 mt-2">
      {children}
    </div>
  );
}
