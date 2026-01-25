import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

export interface MentionUser {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface MentionListProps {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.name });
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-sm text-muted-foreground">
          Nenhum usuário encontrado
        </div>
      );
    }

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => selectItem(index)}
          >
            {item.avatar_url ? (
              <img
                src={item.avatar_url}
                alt={item.name}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
            )}
            <span className="truncate">{item.name}</span>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';
