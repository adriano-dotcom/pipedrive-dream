import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  className?: string;
}

// Função para determinar se o texto deve ser claro ou escuro baseado na cor de fundo
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function TagBadge({ name, color, onRemove, className }: TagBadgeProps) {
  const textColor = getContrastColor(color);
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all',
        onRemove && 'pr-1',
        className
      )}
      style={{ 
        backgroundColor: color,
        color: textColor,
      }}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/20 transition-colors"
          aria-label={`Remover etiqueta ${name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
