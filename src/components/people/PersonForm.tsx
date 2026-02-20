import { useState, useEffect } from 'react';
import { toTitleCase } from '@/lib/import';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CpfInput } from '@/components/ui/cpf-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getErrorMessage } from '@/services/supabaseErrors';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { PersonTagsSelector } from './PersonTagsSelector';
import { usePersonTagAssignments, useAssignPersonTags } from '@/hooks/usePersonTags';
import { useVendedores } from '@/hooks/useVendedores';

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

type Person = Tables<'people'>;

const personSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  cpf: z.string().trim().max(14, 'CPF inválido').optional().or(z.literal('')),
  email: z.string().trim().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().trim().max(20, 'Telefone inválido').optional().or(z.literal('')),
  whatsapp: z.string().trim().max(20, 'WhatsApp inválido').optional().or(z.literal('')),
  job_title: z.string().trim().max(100, 'Cargo muito longo').optional().or(z.literal('')),
  organization_id: z.string().uuid().optional().or(z.literal('')),
  owner_id: z.string().uuid().optional().or(z.literal('')),
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
  
  // Estado para validação inline de email
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  // Estado para validação inline de WhatsApp
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [isCheckingWhatsapp, setIsCheckingWhatsapp] = useState(false);
  
  // Estado para etiquetas
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { data: personTags } = usePersonTagAssignments(person?.id);
  const assignTagsMutation = useAssignPersonTags();
  
  // Carregar tags existentes ao editar
  useEffect(() => {
    if (personTags) {
      setSelectedTagIds(personTags.map(pt => pt.tag_id));
    }
  }, [personTags]);

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

  // Função para verificar se WhatsApp já existe
  const checkWhatsappExists = async (whatsapp: string, excludeId?: string): Promise<boolean> => {
    if (!whatsapp || whatsapp.trim() === '') return false;
    
    let query = supabase
      .from('people')
      .select('id')
      .eq('whatsapp', whatsapp.trim());
    
    // Excluir a própria pessoa ao editar
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data } = await query.maybeSingle();
    return !!data;
  };

  // Função para verificar se CPF já existe
  const checkCpfExists = async (cpf: string, excludeId?: string): Promise<boolean> => {
    if (!cpf || cpf.trim() === '') return false;
    
    let query = supabase
      .from('people')
      .select('id')
      .eq('cpf', cpf.trim());
    
    // Excluir a própria pessoa ao editar
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data } = await query.maybeSingle();
    return !!data;
  };

  // Fetch organizations for dropdown - with cache to avoid refetch
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
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Fetch vendedores for owner selector
  const { data: vendedores } = useVendedores();

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
      owner_id: person?.owner_id || '',
      notes: person?.notes || '',
      label: person?.label || '',
      lead_source: person?.lead_source || '',
      utm_source: person?.utm_source || '',
      utm_medium: person?.utm_campaign || '',
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

      // Verificar se WhatsApp já existe
      if (data.whatsapp) {
        const exists = await checkWhatsappExists(data.whatsapp);
        if (exists) {
          throw new Error('Já existe uma pessoa com este WhatsApp cadastrado.');
        }
      }

      // Verificar se CPF já existe
      if (data.cpf) {
        const exists = await checkCpfExists(data.cpf);
        if (exists) {
          throw new Error('Já existe uma pessoa com este CPF cadastrado.');
        }
      }

      const { data: insertedPerson, error } = await supabase.from('people').insert({
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
        owner_id: data.owner_id || user?.id,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      
      // Salvar etiquetas se houver
      if (selectedTagIds.length > 0 && insertedPerson) {
        await assignTagsMutation.mutateAsync({ 
          personId: insertedPerson.id, 
          tagIds: selectedTagIds 
        });
      }
      
      return insertedPerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Pessoa criada com sucesso!', {
        description: 'O contato foi adicionado ao sistema.',
        icon: '✅',
      });
      onSuccess();
    },
    onError: (error) => {
      if (error.message.includes('email')) {
        setEmailError('Este e-mail já está cadastrado no sistema');
        toast.error('E-mail já cadastrado', {
          description: 'Já existe uma pessoa cadastrada com este email.',
          icon: '⚠️',
        });
      } else if (error.message.includes('WhatsApp')) {
        setWhatsappError('Este WhatsApp já está cadastrado no sistema');
        toast.error('WhatsApp já cadastrado', {
          description: 'Já existe uma pessoa cadastrada com este WhatsApp.',
          icon: '⚠️',
        });
      } else if (error.message.includes('CPF')) {
        toast.error('CPF já cadastrado', {
          description: 'Já existe uma pessoa cadastrada com este CPF.',
          icon: '⚠️',
        });
      } else {
        toast.error('Erro ao criar pessoa', {
          description: getErrorMessage(error),
          icon: '❌',
        });
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

      // Verificar se WhatsApp já existe em outra pessoa
      if (data.whatsapp) {
        const exists = await checkWhatsappExists(data.whatsapp, person!.id);
        if (exists) {
          throw new Error('Já existe uma pessoa com este WhatsApp cadastrado.');
        }
      }

      // Verificar se CPF já existe em outra pessoa
      if (data.cpf) {
        const exists = await checkCpfExists(data.cpf, person!.id);
        if (exists) {
          throw new Error('Já existe uma pessoa com este CPF cadastrado.');
        }
      }

      const updateData = {
        ...data,
        email: data.email?.toLowerCase() || null,
        organization_id: data.organization_id || null,
        owner_id: data.owner_id || null,
      };
      const { error } = await supabase
        .from('people')
        .update(updateData)
        .eq('id', person!.id);
      if (error) throw error;
      
      // Atualizar etiquetas
      await assignTagsMutation.mutateAsync({ 
        personId: person!.id, 
        tagIds: selectedTagIds 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person', person!.id] });
      toast.success('Pessoa atualizada com sucesso!', {
        description: 'As alterações foram salvas.',
        icon: '✅',
      });
      onSuccess();
    },
    onError: (error) => {
      if (error.message.includes('email')) {
        setEmailError('Este e-mail já está cadastrado no sistema');
        toast.error('E-mail já cadastrado', {
          description: 'Já existe outra pessoa cadastrada com este email.',
          icon: '⚠️',
        });
      } else if (error.message.includes('WhatsApp')) {
        setWhatsappError('Este WhatsApp já está cadastrado no sistema');
        toast.error('WhatsApp já cadastrado', {
          description: 'Já existe outra pessoa cadastrada com este WhatsApp.',
          icon: '⚠️',
        });
      } else if (error.message.includes('CPF')) {
        toast.error('CPF já cadastrado', {
          description: 'Já existe outra pessoa cadastrada com este CPF.',
          icon: '⚠️',
        });
      } else {
        toast.error('Erro ao atualizar pessoa', {
          description: getErrorMessage(error),
          icon: '❌',
        });
      }
    },
  });

  const onSubmit = (data: PersonFormData) => {
    // Apply title case to name
    data.name = toTitleCase(data.name);
    
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
  const ownerValue = watch('owner_id');

  // Handler para validação de email no blur
  const handleEmailBlur = async () => {
    const email = watch('email');
    if (!email || email.trim() === '') {
      setEmailError(null);
      return;
    }
    
    setIsCheckingEmail(true);
    try {
      const exists = await checkEmailExists(email, person?.id);
      if (exists) {
        setEmailError('Este e-mail já está cadastrado no sistema');
      } else {
        setEmailError(null);
      }
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Handler para validação de WhatsApp no blur
  const handleWhatsappBlur = async () => {
    const whatsapp = watch('whatsapp');
    if (!whatsapp || whatsapp.trim() === '') {
      setWhatsappError(null);
      return;
    }
    
    setIsCheckingWhatsapp(true);
    try {
      const exists = await checkWhatsappExists(whatsapp, person?.id);
      if (exists) {
        setWhatsappError('Este WhatsApp já está cadastrado no sistema');
      } else {
        setWhatsappError(null);
      }
    } finally {
      setIsCheckingWhatsapp(false);
    }
  };

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
          {person?.pipedrive_id && (
            <div className="space-y-2">
              <Label htmlFor="pipedrive_id">ID Pipedrive</Label>
              <Input id="pipedrive_id" value={person.pipedrive_id} disabled className="bg-muted" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <CpfInput
              id="cpf"
              value={watch('cpf') || ''}
              onValueChange={(value) => setValue('cpf', value)}
            />
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
            <Label htmlFor="owner_id">Captado por</Label>
            <Select
              value={ownerValue || ''}
              onValueChange={(value) => setValue('owner_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor..." />
              </SelectTrigger>
              <SelectContent>
                {vendedores?.map((vendedor) => (
                  <SelectItem key={vendedor.user_id} value={vendedor.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={vendedor.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(vendedor.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {vendedor.full_name}
                    </div>
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
          
          {/* Etiquetas */}
          <div className="sm:col-span-2">
            <PersonTagsSelector
              selectedTagIds={selectedTagIds}
              onTagsChange={setSelectedTagIds}
            />
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
            <Input
              id="phone"
              {...register('phone')}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              {...register('whatsapp')}
              placeholder="(00) 00000-0000"
              onBlur={handleWhatsappBlur}
              onChange={(e) => {
                register('whatsapp').onChange(e);
                if (whatsappError) setWhatsappError(null);
              }}
              className={whatsappError ? 'border-destructive' : ''}
            />
            {isCheckingWhatsapp && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando...
              </p>
            )}
            {whatsappError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {whatsappError}
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              {...register('email', {
                onChange: () => {
                  if (emailError) setEmailError(null);
                }
              })} 
              placeholder="joao@email.com"
              onBlur={handleEmailBlur}
              className={emailError ? 'border-destructive' : ''}
            />
            {isCheckingEmail && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando...
              </p>
            )}
            {emailError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {emailError}
              </p>
            )}
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
        <Button type="submit" disabled={isLoading || !!emailError || !!whatsappError}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {person ? 'Salvando...' : 'Criando...'}
            </>
          ) : (
            person ? 'Salvar Alterações' : 'Criar Pessoa'
          )}
        </Button>
      </div>
    </form>
  );
}
