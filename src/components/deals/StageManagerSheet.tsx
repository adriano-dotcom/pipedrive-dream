import { useState } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2 } from 'lucide-react';
import { StageItem } from './StageItem';

interface Stage {
  id: string;
  name: string;
  color: string | null;
  probability: number | null;
  position: number;
  pipeline_id: string;
}

interface StageManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  pipelineName: string;
}

const DEFAULT_COLOR = '#6366f1';

export function StageManagerSheet({
  open,
  onOpenChange,
  pipelineId,
  pipelineName,
}: StageManagerSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newStageName, setNewStageName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch stages for this pipeline
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['stages', pipelineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!pipelineId && open,
  });

  // Fetch deals count per stage
  const { data: dealsCounts = {} } = useQuery({
    queryKey: ['deals-counts', pipelineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('stage_id')
        .eq('pipeline_id', pipelineId)
        .eq('status', 'open');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((deal) => {
        if (deal.stage_id) {
          counts[deal.stage_id] = (counts[deal.stage_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!pipelineId && open,
  });

  // Create stage mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const maxPosition = stages.length > 0 
        ? Math.max(...stages.map(s => s.position)) + 1 
        : 0;
      
      const { error } = await supabase
        .from('stages')
        .insert({
          name,
          pipeline_id: pipelineId,
          position: maxPosition,
          color: DEFAULT_COLOR,
          probability: 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages', pipelineId] });
      setNewStageName('');
      setIsCreating(false);
      toast({ title: 'Etapa criada com sucesso!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar etapa',
        description: error.message,
      });
    },
  });

  // Update stage mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Stage> }) => {
      const { error } = await supabase
        .from('stages')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages', pipelineId] });
      toast({ title: 'Etapa atualizada!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar etapa',
        description: error.message,
      });
    },
  });

  // Delete stage mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages', pipelineId] });
      toast({ title: 'Etapa excluída!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir etapa',
        description: error.message,
      });
    },
  });

  // Reorder stages mutation
  const reorderMutation = useMutation({
    mutationFn: async (reorderedStages: Stage[]) => {
      const updates = reorderedStages.map((stage, index) => ({
        id: stage.id,
        position: index,
        name: stage.name,
        color: stage.color,
        probability: stage.probability,
        pipeline_id: stage.pipeline_id,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('stages')
          .update({ position: update.position })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages', pipelineId] });
      toast({ title: 'Ordem das etapas atualizada!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao reordenar etapas',
        description: error.message,
      });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderMutation.mutate(items);
  };

  const handleCreateStage = () => {
    if (!newStageName.trim()) return;
    createMutation.mutate(newStageName.trim());
  };

  const handleUpdateStage = (id: string, data: Partial<Stage>) => {
    updateMutation.mutate({ id, data });
  };

  const handleDeleteStage = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Gerenciar Etapas</SheetTitle>
          <SheetDescription>
            Pipeline: <strong>{pipelineName}</strong>
            <br />
            Arraste para reordenar, clique para editar.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stages">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {stages.map((stage, index) => (
                      <StageItem
                        key={stage.id}
                        stage={stage}
                        index={index}
                        onUpdate={handleUpdateStage}
                        onDelete={handleDeleteStage}
                        dealsCount={dealsCounts[stage.id] || 0}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {/* Add new stage */}
          <div className="pt-4 border-t">
            {isCreating ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Nome da nova etapa"
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateStage();
                    if (e.key === 'Escape') {
                      setIsCreating(false);
                      setNewStageName('');
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleCreateStage}
                  disabled={!newStageName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Criar'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    setNewStageName('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar nova etapa
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
