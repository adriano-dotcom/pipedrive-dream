import { useState } from 'react';
import { Tag, ChevronDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/shared/TagBadge';
import { cn } from '@/lib/utils';

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface TagFilterPopoverProps {
  tags: TagItem[];
  isLoading?: boolean;
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export function TagFilterPopover({
  tags,
  isLoading = false,
  selectedTagIds,
  onTagsChange,
  placeholder = 'Etiquetas',
  emptyMessage = 'Nenhuma etiqueta encontrada',
}: TagFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemove = (tagId: string) => {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'gap-2 border-border/50 bg-card/50 backdrop-blur-sm',
                'hover:bg-card/80 hover:border-primary/30',
                selectedTagIds.length > 0 && 'border-primary/30 bg-primary/5'
              )}
            >
              <Tag className="h-4 w-4" />
              {placeholder}
              {selectedTagIds.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 px-1.5 bg-primary/20 text-primary font-bold"
                >
                  {selectedTagIds.length}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            {/* Search */}
            {tags.length > 5 && (
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar etiqueta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            )}

            {/* Tag List */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {isLoading ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Carregando...
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  {emptyMessage}
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={() => handleToggle(tag.id)}
                    />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm truncate">{tag.name}</span>
                  </label>
                ))
              )}
            </div>

            {/* Clear All */}
            {selectedTagIds.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="w-full text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar seleção
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Selected Tags as Badges */}
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            onRemove={() => handleRemove(tag.id)}
          />
        ))}

        {/* Clear All Button when tags are selected */}
        {selectedTagIds.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-foreground h-6 px-2"
          >
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
