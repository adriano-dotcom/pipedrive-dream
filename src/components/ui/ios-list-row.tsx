import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface IOSListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  showChevron?: boolean;
  showSeparator?: boolean;
  leftIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  label?: string;
  sublabel?: string;
  destructive?: boolean;
}

const IOSListRow = React.forwardRef<HTMLDivElement, IOSListRowProps>(
  ({ 
    className, 
    showChevron = false, 
    showSeparator = true,
    leftIcon,
    rightContent,
    label,
    sublabel,
    destructive = false,
    children,
    ...props 
  }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 min-h-[44px]",
        "ios-press ios-hover cursor-pointer",
        "transition-all duration-200",
        destructive && "text-destructive",
        className
      )}
      {...props}
    >
      {/* Left Icon */}
      {leftIcon && (
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-lg",
          "bg-primary/10 text-primary",
          destructive && "bg-destructive/10 text-destructive"
        )}>
          {leftIcon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {label ? (
          <>
            <div className={cn(
              "text-sm font-medium",
              destructive ? "text-destructive" : "text-foreground"
            )}>
              {label}
            </div>
            {sublabel && (
              <div className="text-xs text-muted-foreground truncate">
                {sublabel}
              </div>
            )}
          </>
        ) : (
          children
        )}
      </div>

      {/* Right Content */}
      {rightContent && (
        <div className="flex items-center text-muted-foreground text-sm">
          {rightContent}
        </div>
      )}

      {/* Chevron */}
      {showChevron && (
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
      )}

      {/* iOS-style Inline Separator */}
      {showSeparator && (
        <div 
          className="absolute bottom-0 right-0 h-px bg-border/50"
          style={{ left: leftIcon ? '52px' : '16px' }}
        />
      )}
    </div>
  )
);
IOSListRow.displayName = "IOSListRow";

interface IOSListGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: string;
  footer?: string;
}

const IOSListGroup = React.forwardRef<HTMLDivElement, IOSListGroupProps>(
  ({ className, header, footer, children, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)} {...props}>
      {header && (
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {header}
        </div>
      )}
      <div className="ios-glass overflow-hidden">
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement<IOSListRowProps>(child)) {
            return React.cloneElement(child, {
              showSeparator: index < React.Children.count(children) - 1
            });
          }
          return child;
        })}
      </div>
      {footer && (
        <div className="px-4 py-2 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  )
);
IOSListGroup.displayName = "IOSListGroup";

export { IOSListRow, IOSListGroup };
