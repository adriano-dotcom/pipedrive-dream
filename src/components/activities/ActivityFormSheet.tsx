import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, CheckSquare, Phone, Calendar, Mail, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

type Activity = Tables<'activities'>;

const activitySchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(1000).optional(),
  activity_type: z.enum(['task', 'call', 'meeting', 'email', 'deadline']),
  due_date: z.date({ required_error: 'Data de vencimento é obrigatória' }),
  due_time: z.string().optional(),
  duration_minutes: z.number().min(0).max(480).optional(),
  priority: z.enum(['low', 'normal', 'high']),
  deal_id: z.string().uuid().optional().nullable(),
  person_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity | null;
}

const activityTypes = [
  { value: 'task', label: 'Tarefa', icon: CheckSquare },
  { value: 'call', label: 'Ligação', icon: Phone },
  { value: 'meeting', label: 'Reunião', icon: Calendar },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'deadline', label: 'Prazo', icon: Clock },
];

const priorityOptions = [
  { value: 'low', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
];

export function ActivityFormSheet({ open, onOpenChange, activity }: ActivityFormSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!activity;

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: '',
      description: '',
      activity_type: 'task',
      priority: 'normal',
      due_date: new Date(),
      due_time: '',
      duration_minutes: undefined,
      deal_id: null,
      person_id: null,
      organization_id: null,
      notes: '',
    },
  });

  // Reset form when activity changes
  useEffect(() => {
    if (activity) {
      form.reset({
        title: activity.title,
        description: activity.description || '',
        activity_type: activity.activity_type as ActivityFormData['activity_type'],
        priority: (activity.priority || 'normal') as ActivityFormData['priority'],
        due_date: new Date(activity.due_date),
        due_time: activity.due_time || '',
        duration_minutes: activity.duration_minutes || undefined,
        deal_id: activity.deal_id,
        person_id: activity.person_id,
        organization_id: activity.organization_id,
        notes: activity.notes || '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        activity_type: 'task',
        priority: 'normal',
        due_date: new Date(),
        due_time: '',
        duration_minutes: undefined,
        deal_id: null,
        person_id: null,
        organization_id: null,
        notes: '',
      });
    }
  }, [activity, form]);

  // Fetch deals for linking
  const { data: deals } = useQuery({
    queryKey: ['deals-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, title')
        .eq('status', 'open')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch people for linking
  const { data: people } = useQuery({
    queryKey: ['people-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch organizations for linking
  const { data: organizations } = useQuery({
    queryKey: ['organizations-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ActivityFormData) => {
      const payload = {
        title: data.title,
        description: data.description || null,
        activity_type: data.activity_type,
        priority: data.priority,
        due_date: format(data.due_date, 'yyyy-MM-dd'),
        due_time: data.due_time || null,
        duration_minutes: data.duration_minutes || null,
        deal_id: data.deal_id || null,
        person_id: data.person_id || null,
        organization_id: data.organization_id || null,
        notes: data.notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('activities')
          .update(payload)
          .eq('id', activity.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('activities')
          .insert({
            ...payload,
            owner_id: user?.id,
            created_by: user?.id,
            assigned_to: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: isEditing ? 'Atividade atualizada' : 'Atividade criada',
        description: isEditing ? 'A atividade foi atualizada com sucesso.' : 'A atividade foi criada com sucesso.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error saving activity:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a atividade.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: ActivityFormData) => {
    mutation.mutate(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Editar Atividade' : 'Nova Atividade'}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ligar para cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="activity_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activityTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Due Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Vencimento *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
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
                name="due_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duration (for meetings/calls) */}
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (minutos)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ex: 30"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes da atividade..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Linked Items */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm text-muted-foreground">Vincular a</h4>

              <FormField
                control={form.control}
                name="deal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Negócio</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um negócio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {deals?.map((deal) => (
                          <SelectItem key={deal.id} value={deal.id}>
                            {deal.title}
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
                      onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma pessoa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {people?.map((person) => (
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

              <FormField
                control={form.control}
                name="organization_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organização</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma organização" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {organizations?.map((org) => (
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
                      placeholder="Notas adicionais..."
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Atividade'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
