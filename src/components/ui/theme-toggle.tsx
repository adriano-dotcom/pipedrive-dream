import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  collapsed?: boolean;
  className?: string;
}

export function ThemeToggle({ collapsed, className }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn(
          'w-full justify-start gap-3 rounded-xl px-3 py-2.5',
          'text-muted-foreground',
          collapsed && 'justify-center px-2',
          className
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/50">
          <div className="w-[18px] h-[18px]" />
        </div>
        {!collapsed && <span className="font-medium text-sm">Tema</span>}
      </Button>
    );
  }

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    // Add transition class to enable smooth color changes
    document.documentElement.classList.add('theme-transition');
    
    setTheme(isDark ? 'light' : 'dark');
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);
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
        'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300',
        'bg-accent/50'
      )}>
        <div className="relative w-[18px] h-[18px]">
          <Sun className={cn(
            'h-[18px] w-[18px] text-warning absolute inset-0',
            'transition-all duration-300',
            isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
          )} />
          <Moon className={cn(
            'h-[18px] w-[18px] text-primary absolute inset-0',
            'transition-all duration-300',
            isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          )} />
        </div>
      </div>
      {!collapsed && (
        <span className="font-medium text-sm transition-colors duration-200">
          {isDark ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      )}
    </Button>
  );
}
