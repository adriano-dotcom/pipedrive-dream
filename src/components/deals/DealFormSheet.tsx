import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/supabaseErrors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Trash2, Trophy, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NumericFormat } from 'react-number-format';
import { DealTagsSelector } from './DealTagsSelector';
import { useDealTagAssignments, useAssignDealTags } from '@/hooks/useDealTags';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const dealSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  value: z.string()
    .min(1, 'Valor é obrigatório')
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: 'Valor deve ser maior que zero' }
    ),
  pipeline_id: z.string().min(1, 'Funil é obrigatório'),
  stage_id: z.string().min(1, 'Etapa é obrigatória'),
  organization_id: z.string().optional(),
  person_id: z.string().optional(),
  insurance_type: z.string().optional(),
  insurer: z.string().optional(),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  commission_percent: z.string().optional(),
  policy_number: z.string().optional(),
  expected_close_date: z.date().optional().nullable(),
  label: z.string().optional(),
  notes: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealSchema>;

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
  probability: number;
}

interface DealFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: any | null;
  pipelineId: string;
  stages: Stage[];
  defaultOrganizationId?: string | null;
  defaultPersonId?: string | null;
}

const INSURANCE_TYPES = [
  'Carga',
  'Saúde',
  'Frota',
  'Vida',
  'Residencial',
  'Empresarial',
];

const LABELS = ['Quente', 'Morno', 'Frio'];

export function DealFormSheet({
  open,
  onOpenChange,
  deal,
  pipelineId,
  stages,
  defaultOrganizationId,
  defaultPersonId,
}: DealFormSheetProps) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!deal?.id;
  
  // State for pipeline change confirmation
  const [isConfirmingPipelineChange, setIsConfirmingPipelineChange] = useState(false);
  const [pendingPipelineId, setPendingPipelineId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  // Tags
  const { data: existingTagAssignments = [] } = useDealTagAssignments(deal?.id);
  const assignTagsMutation = useAssignDealTags();
  
  // Sync tags when existing assignments load - only when sheet is open to prevent render loops
  useEffect(() => {
    // Only sync when sheet is open to avoid render loops on detail pages
    if (!open) return;
    
    if (deal?.id && existingTagAssignments.length > 0) {
      const newTagIds = existingTagAssignments.map(a => a.tag_id).sort();
      const currentTagIds = selectedTagIds.slice().sort();
      // Only update if different to prevent infinite loops
      if (newTagIds.join(',') !== currentTagIds.join(',')) {
        setSelectedTagIds(newTagIds);
      }
    } else if (!deal?.id) {
      // Only reset if not already empty
      if (selectedTagIds.length > 0) {
        setSelectedTagIds([]);
      }
    }
  }, [open, existingTagAssignments, deal?.id]);
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      value: '',
      pipeline_id: pipelineId || '',
      stage_id: stages[0]?.id || '',
      organization_id: defaultOrganizationId || '',
      person_id: defaultPersonId || '',
      insurance_type: '',
      insurer: '',
      start_date: null,
      end_date: null,
      commission_percent: '',
      policy_number: '',
      expected_close_date: null,
      label: '',
      notes: '',
    },
  });

  // Fetch all pipelines - only when sheet is open
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Watch selected pipeline and stage
  const selectedPipelineId = form.watch('pipeline_id');
  const currentStageId = form.watch('stage_id');

  // Handle pipeline change with confirmation if stage is selected
  const handlePipelineChange = (newPipelineId: string) => {
    // If the pipeline is the same, do nothing
    if (newPipelineId === selectedPipelineId) return;
    
    // If a stage is already selected, prompt for confirmation
    if (currentStageId) {
      setPendingPipelineId(newPipelineId);
      setIsConfirmingPipelineChange(true);
    } else {
      // If no stage is selected, change directly
      form.setValue('pipeline_id', newPipelineId);
      form.setValue('stage_id', '');
    }
  };

  const confirmPipelineChange = () => {
    if (pendingPipelineId) {
      form.setValue('pipeline_id', pendingPipelineId);
      form.setValue('stage_id', '');
      setPendingPipelineId(null);
      setIsConfirmingPipelineChange(false);
    }
  };

  const cancelPipelineChange = () => {
    setPendingPipelineId(null);
    setIsConfirmingPipelineChange(false);
  };

  // Fetch stages for selected pipeline
  const { data: dynamicStages = [] } = useQuery({
    queryKey: ['stages-dynamic', selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      const { data, error } = await supabase
        .from('stages')
        .select('id, name, position, color, probability')
        .eq('pipeline_id', selectedPipelineId)
        .order('position');
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!selectedPipelineId,
  });

  // Fetch organizations - only when sheet is open
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch people based on selected organization - only when sheet is open
  const selectedOrgId = form.watch('organization_id');
  const { data: people = [] } = useQuery({
    queryKey: ['people-select', selectedOrgId],
    queryFn: async () => {
      let query = supabase.from('people').select('id, name').order('name');
      if (selectedOrgId) {
        query = query.eq('organization_id', selectedOrgId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Reset form when deal changes
  useEffect(() => {
    if (deal) {
      form.reset({
        title: deal.title || '',
        value: deal.value?.toString() || '',
        pipeline_id: deal.pipeline_id || pipelineId || '',
        stage_id: deal.stage_id || stages[0]?.id || '',
        organization_id: deal.organization_id || '',
        person_id: deal.person_id || '',
        insurance_type: deal.insurance_type || '',
        insurer: deal.insurer || '',
        start_date: deal.start_date ? new Date(deal.start_date) : null,
        end_date: deal.end_date ? new Date(deal.end_date) : null,
        commission_percent: deal.commission_percent?.toString() || '',
        policy_number: deal.policy_number || '',
        expected_close_date: deal.expected_close_date ? new Date(deal.expected_close_date) : null,
        label: deal.label || '',
        notes: deal.notes || '',
      });
    } else {
      form.reset({
        title: '',
        value: '',
        pipeline_id: pipelineId || '',
        stage_id: stages[0]?.id || '',
        organization_id: defaultOrganizationId || '',
        person_id: defaultPersonId || '',
        insurance_type: '',
        insurer: '',
        start_date: null,
        end_date: null,
        commission_percent: '',
        policy_number: '',
        expected_close_date: null,
        label: '',
        notes: '',
      });
    }
  }, [deal, stages, form, pipelineId, defaultOrganizationId, defaultPersonId]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (values: DealFormValues) => {
      const dealData = {
        title: values.title,
        value: values.value ? parseFloat(values.value) : 0,
        stage_id: values.stage_id,
        pipeline_id: values.pipeline_id,
        organization_id: values.organization_id || null,
        person_id: values.person_id || null,
        insurance_type: values.insurance_type || null,
        insurer: values.insurer || null,
        start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : null,
        end_date: values.end_date ? format(values.end_date, 'yyyy-MM-dd') : null,
        commission_percent: values.commission_percent ? parseFloat(values.commission_percent) : null,
        policy_number: values.policy_number || null,
        expected_close_date: values.expected_close_date
          ? format(values.expected_close_date, 'yyyy-MM-dd')
          : null,
        label: values.label || null,
        notes: values.notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('deals')
          .update(dealData)
          .eq('id', deal.id);
        if (error) throw error;
        
        // Save tags for existing deal
        await assignTagsMutation.mutateAsync({
          dealId: deal.id,
          tagIds: selectedTagIds,
        });
      } else {
        const { data: newDeal, error } = await supabase.from('deals').insert({
          ...dealData,
          owner_id: user?.id,
          created_by: user?.id,
        }).select().single();
        if (error) throw error;
        
        // Save tags for new deal
        if (selectedTagIds.length > 0 && newDeal) {
          await assignTagsMutation.mutateAsync({
            dealId: newDeal.id,
            tagIds: selectedTagIds,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast({
        title: isEditing ? 'Negócio atualizado!' : 'Negócio criado!',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar negócio',
        description: getErrorMessage(error),
      });
    },
  });

  // Mark as won/lost mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, lost_reason }: { status: 'won' | 'lost'; lost_reason?: string }) => {
      const updateData: any = {
        status,
        [status === 'won' ? 'won_at' : 'lost_at']: new Date().toISOString(),
      };
      if (lost_reason) updateData.lost_reason = lost_reason;

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', deal.id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast({
        title: status === 'won' ? '🎉 Negócio ganho!' : 'Negócio perdido',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: getErrorMessage(error),
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('deals').delete().eq('id', deal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast({ title: 'Negócio excluído!' });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir negócio',
        description: getErrorMessage(error),
      });
    },
  });

  const onSubmit = (values: DealFormValues) => {
    saveMutation.mutate(values);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar Negócio' : 'Novo Negócio'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Atualize os dados do negócio' : 'Preencha os dados do novo negócio'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Seguro Carga - Empresa XYZ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Value */}
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$) *</FormLabel>
                  <FormControl>
                    <NumericFormat
                      customInput={Input}
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="R$ "
                      decimalScale={2}
                      allowNegative={false}
                      placeholder="R$ 0,00"
                      value={field.value}
                      onValueChange={(values) => {
                        field.onChange(values.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pipeline and Stage */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pipeline_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funil *</FormLabel>
                    <Select
                      onValueChange={handlePipelineChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pipelines.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etapa *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedPipelineId || dynamicStages.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dynamicStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Organization and Person */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="organization_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organização</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="person_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pessoa</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {people.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Insurance Fields */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Dados do Seguro</h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="insurance_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Seguro</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)}
                        value={field.value || '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {INSURANCE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="insurer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seguradora</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Porto Seguro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Início Vigência</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value
                                ? format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                : 'Selecione'}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fim Vigência</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value
                                ? format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                : 'Selecione'}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="commission_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comissão (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="policy_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Apólice</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Control Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_close_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Previsão Fechamento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                              : 'Selecione'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperatura</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {LABELS.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações sobre o negócio..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <DealTagsSelector
              selectedTagIds={selectedTagIds}
              onTagsChange={setSelectedTagIds}
            />

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-4">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Negócio'}
              </Button>

              {isEditing && (
                <>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-primary/50 text-primary hover:bg-primary/10"
                      onClick={() => updateStatusMutation.mutate({ status: 'won' })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Ganho
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                      onClick={() => updateStatusMutation.mutate({ status: 'lost' })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Perdido
                    </Button>
                  </div>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Negócio
                    </Button>
                  )}
                </>
              )}
            </div>
          </form>
        </Form>
      </SheetContent>

      {/* Confirmation dialog for pipeline change */}
      <AlertDialog open={isConfirmingPipelineChange} onOpenChange={setIsConfirmingPipelineChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Troca de Funil?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao trocar de funil, a etapa atual será perdida e você precisará selecionar uma nova etapa. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelPipelineChange}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPipelineChange}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
