import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  collapsed?: boolean;
  className?: string;
}

export function ThemeToggle({ collapsed, className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={cn(
        'w-full justify-start gap-3 rounded-xl px-3 py-2.5',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-accent/50 transition-all duration-200',
        collapsed && 'justify-center px-2',
        className
      )}
    >
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
        'bg-accent/50'
      )}>
        {isDark ? (
          <Sun className="h-[18px] w-[18px] text-warning" />
        ) : (
          <Moon className="h-[18px] w-[18px] text-primary" />
        )}
      </div>
      {!collapsed && (
        <span className="font-medium text-sm">
          {isDark ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      )}
    </Button>
  );
}
