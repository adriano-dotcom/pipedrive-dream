import { useState } from 'react';
import { Check, ChevronDown, Plus, Pencil, Star, Settings } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  onEdit?: (pipeline: Pipeline) => void;
  onSetUserDefault?: (pipelineId: string) => void;
  userDefaultPipelineId?: string | null;
  isLoading?: boolean;
}

export function PipelineSelector({
  pipelines,
  selectedPipeline,
  onSelect,
  onCreateNew,
  onManage,
  onEdit,
  onSetUserDefault,
  userDefaultPipelineId,
  isLoading,
}: PipelineSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleSetDefault = (e: React.MouseEvent, pipelineId: string) => {
    e.stopPropagation();
    onSetUserDefault?.(pipelineId);
  };

  const handleEdit = (e: React.MouseEvent, pipeline: Pipeline) => {
    e.stopPropagation();
    setOpen(false);
    onEdit?.(pipeline);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "min-w-[200px] justify-between",
            "bg-card/50 backdrop-blur-sm border-border/50",
            "hover:bg-card/80 hover:border-primary/30",
            open && "border-primary/50 bg-card/80"
          )}
          disabled={isLoading}
        >
          <span className="truncate font-medium">
            {selectedPipeline?.name || 'Selecionar funil...'}
          </span>
          <ChevronDown className={cn(
            "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
            open && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-card/95 backdrop-blur-xl border-white/[0.08]" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Buscar funil..." />
          <CommandList>
            <CommandEmpty>Nenhum funil encontrado.</CommandEmpty>
            <CommandGroup heading="Funis de Vendas">
              {pipelines.map((pipeline) => {
                const isUserDefault = pipeline.id === userDefaultPipelineId;
                
                return (
                  <CommandItem
                    key={pipeline.id}
                    value={pipeline.name}
                    onSelect={() => {
                      onSelect(pipeline);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 group"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        selectedPipeline?.id === pipeline.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{pipeline.name}</span>
                      {isUserDefault && (
                        <span className="ml-2 text-xs text-primary">
                          (Meu Padrão)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleSetDefault(e, pipeline.id)}
                            className={cn(
                              "p-1 rounded hover:bg-accent transition-colors",
                              isUserDefault && "text-primary"
                            )}
                          >
                            <Star className={cn("h-3.5 w-3.5", isUserDefault && "fill-current")} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {isUserDefault ? 'Funil padrão atual' : 'Definir como meu padrão'}
                        </TooltipContent>
                      </Tooltip>
                      {onEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => handleEdit(e, pipeline)}
                              className="p-1 rounded hover:bg-accent transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Editar funil
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
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
