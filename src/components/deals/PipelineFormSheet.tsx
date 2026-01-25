import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const pipelineSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  is_default: z.boolean().default(false),
});

type PipelineFormData = z.infer<typeof pipelineSchema>;

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean | null;
}

interface PipelineFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline?: Pipeline | null;
}

const defaultStages = [
  { name: 'Prospecção', color: '#3b82f6', probability: 10, position: 0 },
  { name: 'Qualificação', color: '#eab308', probability: 25, position: 1 },
  { name: 'Proposta', color: '#f97316', probability: 50, position: 2 },
  { name: 'Negociação', color: '#8b5cf6', probability: 75, position: 3 },
  { name: 'Fechamento', color: '#22c55e', probability: 90, position: 4 },
  { name: 'Ganho', color: '#16a34a', probability: 100, position: 5 },
];

export function PipelineFormSheet({ open, onOpenChange, pipeline }: PipelineFormSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      name: '',
      description: '',
      is_default: false,
    },
  });

  useEffect(() => {
    if (pipeline) {
      form.reset({
        name: pipeline.name,
        description: pipeline.description || '',
        is_default: pipeline.is_default || false,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        is_default: false,
      });
    }
  }, [pipeline, form]);

  const createMutation = useMutation({
    mutationFn: async (data: PipelineFormData) => {
      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('pipelines')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const { data: newPipeline, error } = await supabase
        .from('pipelines')
        .insert({
          name: data.name,
          description: data.description || null,
          is_default: data.is_default,
          created_by: user?.id,
          owner_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default stages for new pipeline
      const stagesToCreate = defaultStages.map((stage) => ({
        ...stage,
        pipeline_id: newPipeline.id,
      }));

      const { error: stagesError } = await supabase
        .from('stages')
        .insert(stagesToCreate);

      if (stagesError) throw stagesError;

      return newPipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast({ title: 'Funil criado com sucesso!' });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar funil',
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PipelineFormData) => {
      if (!pipeline) return;

      // If setting as default, unset other defaults first
      if (data.is_default && !pipeline.is_default) {
        await supabase
          .from('pipelines')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const { error } = await supabase
        .from('pipelines')
        .update({
          name: data.name,
          description: data.description || null,
          is_default: data.is_default,
        })
        .eq('id', pipeline.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast({ title: 'Funil atualizado com sucesso!' });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar funil',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: PipelineFormData) => {
    if (pipeline) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>
            {pipeline ? 'Editar Funil' : 'Novo Funil de Vendas'}
          </SheetTitle>
          <SheetDescription>
            {pipeline
              ? 'Atualize as informações do funil de vendas.'
              : 'Crie um novo funil para organizar seus negócios.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Funil</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Vendas B2B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o objetivo deste funil..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Funil Padrão</FormLabel>
                    <FormDescription>
                      Este funil será selecionado automaticamente ao abrir a página.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!pipeline && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  O novo funil será criado com as etapas padrão: Prospecção,
                  Qualificação, Proposta, Negociação, Fechamento e Ganho.
                  Você pode personalizar depois.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {pipeline ? 'Salvar' : 'Criar Funil'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
