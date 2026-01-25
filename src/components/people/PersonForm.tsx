import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PatternFormat } from 'react-number-format';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

const personSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  cpf: z.string().trim().max(14, 'CPF inválido').optional().or(z.literal('')),
  email: z.string().trim().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().trim().max(20, 'Telefone inválido').optional().or(z.literal('')),
  whatsapp: z.string().trim().max(20, 'WhatsApp inválido').optional().or(z.literal('')),
  job_title: z.string().trim().max(100, 'Cargo muito longo').optional().or(z.literal('')),
  organization_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().trim().max(2000, 'Observações muito longas').optional().or(z.literal('')),
  label: z.string().optional().or(z.literal('')),
  lead_source: z.string().trim().max(100, 'Origem muito longa').optional().or(z.literal('')),
  utm_source: z.string().trim().max(100).optional().or(z.literal('')),
  utm_medium: z.string().trim().max(100).optional().or(z.literal('')),
  utm_campaign: z.string().trim().max(100).optional().or(z.literal('')),
});

type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormProps {
  person?: Person | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PersonForm({ person, onSuccess, onCancel }: PersonFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Função para verificar se email já existe
  const checkEmailExists = async (email: string, excludeId?: string): Promise<boolean> => {
    if (!email || email.trim() === '') return false;
    
    let query = supabase
      .from('people')
      .select('id')
      .eq('email', email.trim().toLowerCase());
    
    // Excluir a própria pessoa ao editar
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data } = await query.maybeSingle();
    return !!data;
  };

  // Fetch organizations for dropdown
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: person?.name || '',
      cpf: person?.cpf || '',
      email: person?.email || '',
      phone: person?.phone || '',
      whatsapp: person?.whatsapp || '',
      job_title: person?.job_title || '',
      organization_id: person?.organization_id || '',
      notes: person?.notes || '',
      label: person?.label || '',
      lead_source: person?.lead_source || '',
      utm_source: person?.utm_source || '',
      utm_medium: person?.utm_medium || '',
      utm_campaign: person?.utm_campaign || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      // Verificar se email já existe
      if (data.email) {
        const exists = await checkEmailExists(data.email);
        if (exists) {
          throw new Error('Já existe uma pessoa com este email cadastrado.');
        }
      }

      const { error } = await supabase.from('people').insert({
        name: data.name,
        cpf: data.cpf || null,
        email: data.email?.toLowerCase() || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        job_title: data.job_title || null,
        organization_id: data.organization_id || null,
        notes: data.notes || null,
        label: data.label || null,
        lead_source: data.lead_source || null,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        owner_id: user?.id,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Pessoa criada com sucesso!');
      onSuccess();
    },
    onError: (error) => {
      if (error.message.includes('email')) {
        toast.error('Email duplicado', {
          description: 'Já existe uma pessoa cadastrada com este email.',
        });
      } else {
        toast.error('Erro ao criar pessoa: ' + error.message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      // Verificar se email já existe em outra pessoa
      if (data.email) {
        const exists = await checkEmailExists(data.email, person!.id);
        if (exists) {
          throw new Error('Já existe uma pessoa com este email cadastrado.');
        }
      }

      const updateData = {
        ...data,
        email: data.email?.toLowerCase() || null,
        organization_id: data.organization_id || null,
      };
      const { error } = await supabase
        .from('people')
        .update(updateData)
        .eq('id', person!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Pessoa atualizada com sucesso!');
      onSuccess();
    },
    onError: (error) => {
      if (error.message.includes('email')) {
        toast.error('Email duplicado', {
          description: 'Já existe uma pessoa cadastrada com este email.',
        });
      } else {
        toast.error('Erro ao atualizar pessoa: ' + error.message);
      }
    },
  });

  const onSubmit = (data: PersonFormData) => {
    // Clean empty strings to null
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === '' ? null : value])
    ) as PersonFormData;

    if (person) {
      updateMutation.mutate(cleanedData);
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const labelValue = watch('label');
  const organizationValue = watch('organization_id');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Informações Básicas
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input id="name" {...register('name')} placeholder="João da Silva" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" {...register('cpf')} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_title">Cargo</Label>
            <Input id="job_title" {...register('job_title')} placeholder="Gerente" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization_id">Organização</Label>
            <Select
              value={organizationValue || ''}
              onValueChange={(value) => setValue('organization_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Status/Temperatura</Label>
            <Select
              value={labelValue || ''}
              onValueChange={(value) => setValue('label', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Quente">🔥 Quente</SelectItem>
                <SelectItem value="Morno">🌤️ Morno</SelectItem>
                <SelectItem value="Frio">❄️ Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Contato
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <PatternFormat
              format="(##) #####-####"
              mask="_"
              customInput={Input}
              id="phone"
              value={watch('phone') || ''}
              onValueChange={(values) => {
                setValue('phone', values.value);
              }}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <PatternFormat
              format="(##) #####-####"
              mask="_"
              customInput={Input}
              id="whatsapp"
              value={watch('whatsapp') || ''}
              onValueChange={(values) => {
                setValue('whatsapp', values.value);
              }}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} placeholder="joao@email.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </div>
      </div>

      {/* Lead Source */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Origem do Lead
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="lead_source">Origem</Label>
            <Input id="lead_source" {...register('lead_source')} placeholder="Google, Indicação, Evento..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="utm_source">UTM Source</Label>
            <Input id="utm_source" {...register('utm_source')} placeholder="google" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="utm_medium">UTM Medium</Label>
            <Input id="utm_medium" {...register('utm_medium')} placeholder="cpc" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="utm_campaign">UTM Campaign</Label>
            <Input id="utm_campaign" {...register('utm_campaign')} placeholder="campanha_verao" />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Informações adicionais sobre a pessoa..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {person ? 'Salvar Alterações' : 'Criar Pessoa'}
        </Button>
      </div>
    </form>
  );
}
