import { useState } from 'react';
import { Check, ChevronDown, Plus, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean | null;
}

interface PipelineSelectorProps {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  onSelect: (pipeline: Pipeline) => void;
  onCreateNew: () => void;
  onManage?: () => void;
  isLoading?: boolean;
}

export function PipelineSelector({
  pipelines,
  selectedPipeline,
  onSelect,
  onCreateNew,
  onManage,
  isLoading,
}: PipelineSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-[200px] justify-between bg-background hover:bg-accent"
          disabled={isLoading}
        >
          <span className="truncate">
            {selectedPipeline?.name || 'Selecionar funil...'}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar funil..." />
          <CommandList>
            <CommandEmpty>Nenhum funil encontrado.</CommandEmpty>
            <CommandGroup heading="Funis de Vendas">
              {pipelines.map((pipeline) => (
                <CommandItem
                  key={pipeline.id}
                  value={pipeline.name}
                  onSelect={() => {
                    onSelect(pipeline);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      selectedPipeline?.id === pipeline.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{pipeline.name}</span>
                    {pipeline.is_default && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Padrão)
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onCreateNew();
                  setOpen(false);
                }}
                className="text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar novo funil
              </CommandItem>
              {onManage && (
                <CommandItem
                  onSelect={() => {
                    onManage();
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Gerenciar funis
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
