import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface IOSSearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  showCancel?: boolean;
  onCancel?: () => void;
}

const IOSSearchBar = React.forwardRef<HTMLInputElement, IOSSearchBarProps>(
  ({ className, value, onChange, showCancel = false, onCancel, placeholder = "Buscar...", ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    const handleClear = () => {
      onChange?.("");
      inputRef.current?.focus();
    };

    const handleCancel = () => {
      onChange?.("");
      setIsFocused(false);
      onCancel?.();
    };

    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div 
          className={cn(
            "flex-1 flex items-center gap-2 px-3 py-2 h-10",
            "ios-glass-subtle rounded-full",
            "transition-all duration-200",
            isFocused && "ring-2 ring-primary/30"
          )}
        >
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={cn(
              "flex-1 bg-transparent text-sm outline-none",
              "placeholder:text-muted-foreground"
            )}
            {...props}
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full",
                "bg-muted-foreground/20 text-muted-foreground",
                "hover:bg-muted-foreground/30 transition-colors",
                "ios-press"
              )}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Cancel Button */}
        {showCancel && (isFocused || value) && (
          <button
            type="button"
            onClick={handleCancel}
            className={cn(
              "text-sm text-primary font-medium",
              "ios-press transition-opacity duration-200",
              "animate-in slide-in-from-right-2 fade-in"
            )}
          >
            Cancelar
          </button>
        )}
      </div>
    );
  }
);
IOSSearchBar.displayName = "IOSSearchBar";

export { IOSSearchBar };
