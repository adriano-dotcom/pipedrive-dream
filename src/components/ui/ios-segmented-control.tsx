import * as React from "react";
import { cn } from "@/lib/utils";

interface IOSSegmentedControlProps {
  segments: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const IOSSegmentedControl = React.forwardRef<HTMLDivElement, IOSSegmentedControlProps>(
  ({ segments, value, onChange, className }, ref) => {
    const activeIndex = segments.findIndex(s => s.value === value);

    return (
      <div 
        ref={ref}
        className={cn(
          "inline-flex p-1 rounded-full",
          "ios-glass-subtle",
          className
        )}
      >
        <div className="relative flex">
          {/* Animated Background Slider */}
          <div
            className={cn(
              "absolute inset-y-0 rounded-full",
              "bg-background shadow-sm",
              "ios-segment-slider"
            )}
            style={{
              width: `${100 / segments.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />

          {/* Segments */}
          {segments.map((segment) => (
            <button
              key={segment.value}
              type="button"
              onClick={() => onChange(segment.value)}
              className={cn(
                "relative z-10 px-4 py-1.5 text-sm font-medium rounded-full",
                "transition-colors duration-200",
                "ios-press",
                value === segment.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {segment.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
);
IOSSegmentedControl.displayName = "IOSSegmentedControl";

export { IOSSegmentedControl };
