import * as React from "react";
import { cn } from "@/lib/utils";

interface IOSTabBarItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface IOSTabBarProps {
  items: IOSTabBarItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const IOSTabBar = React.forwardRef<HTMLDivElement, IOSTabBarProps>(
  ({ items, value, onChange, className }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "ios-glass border-t border-border/30",
          "ios-safe-bottom",
          "md:hidden",
          className
        )}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {items.map((item) => {
            const isActive = value === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange(item.value)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1.5",
                  "ios-press transition-all duration-200",
                  "rounded-xl min-w-[64px]"
                )}
              >
                <div className={cn(
                  "relative transition-all duration-200",
                  isActive && "text-primary"
                )}>
                  {item.icon}
                  {/* Glow effect for active item */}
                  {isActive && (
                    <div className="absolute inset-0 blur-lg bg-primary/30 -z-10 scale-150" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);
IOSTabBar.displayName = "IOSTabBar";

export { IOSTabBar };
