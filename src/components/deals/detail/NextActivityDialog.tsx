import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Phone, Mail, Users, CheckSquare, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface NextActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
}

const activityTypes = [
  { value: 'call', label: 'Ligação', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Reunião', icon: Users },
  { value: 'task', label: 'Tarefa', icon: CheckSquare },
  { value: 'deadline', label: 'Prazo', icon: Clock },
];

export function NextActivityDialog({ open, onOpenChange, dealId }: NextActivityDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState('task');
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 1));
  const [dueTime, setDueTime] = useState('');

  const createActivityMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('activities').insert({
        title,
        activity_type: activityType,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        due_time: dueTime || null,
        deal_id: dealId,
        created_by: user?.id,
        owner_id: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-activities', dealId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Próxima atividade criada!');
      handleClose();
    },
    onError: (error) => {
      toast.error('Erro ao criar atividade: ' + error.message);
    },
  });

  const handleClose = () => {
    setTitle('');
    setActivityType('task');
    setDueDate(addDays(new Date(), 1));
    setDueTime('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Informe o título da atividade');
      return;
    }
    createActivityMutation.mutate();
  };

  const selectedType = activityTypes.find(t => t.value === activityType);
  const TypeIcon = selectedType?.icon || CheckSquare;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckSquare className="h-4 w-4 text-primary" />
            </div>
            Criar próxima atividade?
          </DialogTitle>
          <DialogDescription>
            Atividade concluída! Deseja agendar a próxima ação para este negócio?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da atividade</Label>
            <Input
              id="title"
              placeholder="Ex: Ligar para confirmar proposta"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4" />
                      {selectedType?.label}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => date && setDueDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Horário (opcional)</Label>
            <Input
              id="time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Não, obrigado
            </Button>
            <Button type="submit" disabled={createActivityMutation.isPending}>
              {createActivityMutation.isPending ? 'Criando...' : 'Criar Atividade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
