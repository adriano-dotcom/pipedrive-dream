import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface IOSNavBarProps {
  title?: string;
  largeTitle?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  showBackButton?: boolean;
  transparent?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const IOSNavBar = React.forwardRef<HTMLDivElement, IOSNavBarProps>(
  ({ 
    title, 
    largeTitle = false,
    leftAction, 
    rightAction, 
    onBack, 
    showBackButton = false,
    transparent = false,
    className,
    children 
  }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-40 w-full",
          !transparent && "ios-glass border-b border-border/30",
          transparent && "bg-transparent",
          className
        )}
      >
        {/* Standard Nav Bar */}
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left Side */}
          <div className="flex items-center gap-2 min-w-[80px]">
            {showBackButton && onBack && (
              <button
                type="button"
                onClick={onBack}
                className={cn(
                  "flex items-center gap-0.5 text-primary font-medium",
                  "ios-press -ml-2 px-2 py-1 rounded-lg"
                )}
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Voltar</span>
              </button>
            )}
            {leftAction}
          </div>

          {/* Center Title */}
          {!largeTitle && title && (
            <h1 className="text-base font-semibold text-foreground text-center flex-1 truncate">
              {title}
            </h1>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-2 min-w-[80px] justify-end">
            {rightAction}
          </div>
        </div>

        {/* Large Title (iOS style) */}
        {largeTitle && title && (
          <div className="px-4 pb-3">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
          </div>
        )}

        {/* Optional children (e.g., search bar, segmented control) */}
        {children && (
          <div className="px-4 pb-3">
            {children}
          </div>
        )}
      </header>
    );
  }
);
IOSNavBar.displayName = "IOSNavBar";

export { IOSNavBar };
