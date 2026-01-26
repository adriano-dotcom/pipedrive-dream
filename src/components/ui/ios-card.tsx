import * as React from "react";
import { cn } from "@/lib/utils";

interface IOSCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

const IOSCard = React.forwardRef<HTMLDivElement, IOSCardProps>(
  ({ className, elevated = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        elevated ? "ios-glass-elevated" : "ios-glass",
        "text-card-foreground",
        className
      )}
      {...props}
    />
  )
);
IOSCard.displayName = "IOSCard";

const IOSCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn("flex flex-col space-y-1.5 p-5", className)} 
      {...props} 
    />
  ),
);
IOSCardHeader.displayName = "IOSCardHeader";

const IOSCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 
      ref={ref} 
      className={cn("text-lg font-semibold leading-none tracking-tight", className)} 
      {...props} 
    />
  ),
);
IOSCardTitle.displayName = "IOSCardTitle";

const IOSCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p 
      ref={ref} 
      className={cn("text-sm text-muted-foreground", className)} 
      {...props} 
    />
  ),
);
IOSCardDescription.displayName = "IOSCardDescription";

const IOSCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
  ),
);
IOSCardContent.displayName = "IOSCardContent";

const IOSCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn("flex items-center p-5 pt-0", className)} 
      {...props} 
    />
  ),
);
IOSCardFooter.displayName = "IOSCardFooter";

export { 
  IOSCard, 
  IOSCardHeader, 
  IOSCardFooter, 
  IOSCardTitle, 
  IOSCardDescription, 
  IOSCardContent 
};
