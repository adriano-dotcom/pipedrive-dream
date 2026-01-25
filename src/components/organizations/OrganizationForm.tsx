import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { InsuranceFieldsSection } from './InsuranceFieldsSection';
import { ContactPersonSection } from './ContactPersonSection';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;
type Person = Tables<'people'>;

const organizationSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  cnpj: z.string().trim().max(18, 'CNPJ inválido').optional().or(z.literal('')),
  cnae: z.string().trim().max(20, 'CNAE inválido').optional().or(z.literal('')),
  rntrc_antt: z.string().trim().max(20, 'RNTRC/ANTT inválido').optional().or(z.literal('')),
  automotores: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().max(20, 'Telefone inválido').optional().or(z.literal('')),
  email: z.string().trim().email('Email inválido').optional().or(z.literal('')),
  website: z.string().trim().max(200, 'Website muito longo').optional().or(z.literal('')),
  address_street: z.string().trim().max(200, 'Endereço muito longo').optional().or(z.literal('')),
  address_number: z.string().trim().max(20, 'Número muito longo').optional().or(z.literal('')),
  address_complement: z.string().trim().max(100, 'Complemento muito longo').optional().or(z.literal('')),
  address_neighborhood: z.string().trim().max(100, 'Bairro muito longo').optional().or(z.literal('')),
  address_city: z.string().trim().max(100, 'Cidade muito longa').optional().or(z.literal('')),
  address_state: z.string().trim().max(2, 'Estado inválido').optional().or(z.literal('')),
  address_zipcode: z.string().trim().max(10, 'CEP inválido').optional().or(z.literal('')),
  notes: z.string().trim().max(2000, 'Observações muito longas').optional().or(z.literal('')),
  label: z.string().optional().or(z.literal('')),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationFormProps {
  organization?: Organization | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OrganizationForm({ organization, onSuccess, onCancel }: OrganizationFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Insurance fields state (not part of zod schema for simplicity with arrays)
  const [insuranceBranches, setInsuranceBranches] = useState<string[]>(
    (organization?.insurance_branches as string[]) || []
  );
  const [preferredInsurers, setPreferredInsurers] = useState<string[]>(
    (organization?.preferred_insurers as string[]) || []
  );
  const [fleetType, setFleetType] = useState(organization?.fleet_type || '');
  const [fleetSize, setFleetSize] = useState(organization?.fleet_size?.toString() || '');
  const [currentInsurer, setCurrentInsurer] = useState(organization?.current_insurer || '');
  const [policyRenewalMonth, setPolicyRenewalMonth] = useState(
    organization?.policy_renewal_month?.toString() || ''
  );
  const [annualPremiumEstimate, setAnnualPremiumEstimate] = useState(
    organization?.annual_premium_estimate?.toString() || ''
  );
  const [riskProfile, setRiskProfile] = useState(organization?.risk_profile || '');
  const [hasClaimsHistory, setHasClaimsHistory] = useState(
    organization?.has_claims_history || false
  );
  const [brokerNotes, setBrokerNotes] = useState(organization?.broker_notes || '');
  
  // Contact person state
  const [primaryContactId, setPrimaryContactId] = useState<string | null>(
    organization?.primary_contact_id || null
  );
  const [pendingContacts, setPendingContacts] = useState<Person[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
      cnpj: organization?.cnpj || '',
      cnae: organization?.cnae || '',
      rntrc_antt: organization?.rntrc_antt || '',
      automotores: organization?.automotores?.toString() || '',
      phone: organization?.phone || '',
      email: organization?.email || '',
      website: organization?.website || '',
      address_street: organization?.address_street || '',
      address_number: organization?.address_number || '',
      address_complement: organization?.address_complement || '',
      address_neighborhood: organization?.address_neighborhood || '',
      address_city: organization?.address_city || '',
      address_state: organization?.address_state || '',
      address_zipcode: organization?.address_zipcode || '',
      notes: organization?.notes || '',
      label: organization?.label || '',
    },
  });

  const getInsuranceData = () => ({
    insurance_branches: insuranceBranches.length > 0 ? insuranceBranches : null,
    preferred_insurers: preferredInsurers.length > 0 ? preferredInsurers : null,
    fleet_type: fleetType || null,
    fleet_size: fleetSize ? parseInt(fleetSize, 10) : null,
    current_insurer: currentInsurer || null,
    policy_renewal_month: policyRenewalMonth ? parseInt(policyRenewalMonth, 10) : null,
    annual_premium_estimate: annualPremiumEstimate ? parseFloat(annualPremiumEstimate) : null,
    risk_profile: riskProfile || null,
    has_claims_history: hasClaimsHistory,
    broker_notes: brokerNotes || null,
  });

  const createMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      // Create organization
      const { data: newOrg, error } = await supabase.from('organizations').insert({
        name: data.name,
        cnpj: data.cnpj || null,
        cnae: data.cnae || null,
        rntrc_antt: data.rntrc_antt || null,
        automotores: data.automotores ? parseInt(data.automotores, 10) : null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        address_street: data.address_street || null,
        address_number: data.address_number || null,
        address_complement: data.address_complement || null,
        address_neighborhood: data.address_neighborhood || null,
        address_city: data.address_city || null,
        address_state: data.address_state || null,
        address_zipcode: data.address_zipcode || null,
        notes: data.notes || null,
        label: data.label || null,
        owner_id: user?.id,
        created_by: user?.id,
        primary_contact_id: null, // Will update after linking people
        ...getInsuranceData(),
      }).select().single();
      
      if (error) throw error;
      
      // Link pending contacts to the new organization
      if (pendingContacts.length > 0 && newOrg) {
        const updatePromises = pendingContacts.map(person =>
          supabase
            .from('people')
            .update({ organization_id: newOrg.id })
            .eq('id', person.id)
        );
        await Promise.all(updatePromises);
        
        // Update primary contact if set
        if (primaryContactId) {
          await supabase
            .from('organizations')
            .update({ primary_contact_id: primaryContactId })
            .eq('id', newOrg.id);
        }
      }
      
      return newOrg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Organização criada com sucesso!');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Erro ao criar organização: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const { error } = await supabase
        .from('organizations')
        .update({
          ...data,
          automotores: data.automotores ? parseInt(data.automotores, 10) : null,
          ...getInsuranceData(),
          primary_contact_id: primaryContactId,
        })
        .eq('id', organization!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-contacts'] });
      toast.success('Organização atualizada com sucesso!');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar organização: ' + error.message);
    },
  });

  const onSubmit = (data: OrganizationFormData) => {
    // Clean empty strings to null
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === '' ? null : value])
    ) as OrganizationFormData;

    if (organization) {
      updateMutation.mutate(cleanedData);
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const labelValue = watch('label');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Informações Básicas
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome da Empresa *</Label>
            <Input id="name" {...register('name')} placeholder="Empresa ABC Ltda" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" {...register('cnpj')} placeholder="00.000.000/0000-00" />
            {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnae">CNAE</Label>
            <Input id="cnae" {...register('cnae')} placeholder="4929-9/01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rntrc_antt">RNTRC/ANTT</Label>
            <Input id="rntrc_antt" {...register('rntrc_antt')} placeholder="000000000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="automotores">Automotores</Label>
            <Input
              id="automotores"
              type="number"
              min="0"
              {...register('automotores')}
              placeholder="Quantidade de veículos"
            />
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
            <Input id="phone" {...register('phone')} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} placeholder="contato@empresa.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register('website')} placeholder="https://www.empresa.com" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Endereço
        </h3>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="space-y-2 sm:col-span-4">
            <Label htmlFor="address_street">Rua</Label>
            <Input id="address_street" {...register('address_street')} placeholder="Rua das Flores" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address_number">Número</Label>
            <Input id="address_number" {...register('address_number')} placeholder="123" />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="address_complement">Complemento</Label>
            <Input id="address_complement" {...register('address_complement')} placeholder="Sala 101" />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="address_neighborhood">Bairro</Label>
            <Input id="address_neighborhood" {...register('address_neighborhood')} placeholder="Centro" />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="address_city">Cidade</Label>
            <Input id="address_city" {...register('address_city')} placeholder="São Paulo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_state">UF</Label>
            <Input id="address_state" {...register('address_state')} placeholder="SP" maxLength={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address_zipcode">CEP</Label>
            <Input id="address_zipcode" {...register('address_zipcode')} placeholder="00000-000" />
          </div>
        </div>
      </div>

      {/* Contact People */}
      <ContactPersonSection
        organizationId={organization?.id}
        primaryContactId={primaryContactId}
        onPrimaryContactChange={setPrimaryContactId}
        pendingContacts={pendingContacts}
        onPendingContactsChange={setPendingContacts}
      />

      {/* Insurance Fields */}
      <InsuranceFieldsSection
        insuranceBranches={insuranceBranches}
        preferredInsurers={preferredInsurers}
        fleetType={fleetType}
        fleetSize={fleetSize}
        currentInsurer={currentInsurer}
        policyRenewalMonth={policyRenewalMonth}
        annualPremiumEstimate={annualPremiumEstimate}
        riskProfile={riskProfile}
        hasClaimsHistory={hasClaimsHistory}
        brokerNotes={brokerNotes}
        onInsuranceBranchesChange={setInsuranceBranches}
        onPreferredInsurersChange={setPreferredInsurers}
        onFleetTypeChange={setFleetType}
        onFleetSizeChange={setFleetSize}
        onCurrentInsurerChange={setCurrentInsurer}
        onPolicyRenewalMonthChange={setPolicyRenewalMonth}
        onAnnualPremiumEstimateChange={setAnnualPremiumEstimate}
        onRiskProfileChange={setRiskProfile}
        onHasClaimsHistoryChange={setHasClaimsHistory}
        onBrokerNotesChange={setBrokerNotes}
      />

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações Gerais</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Informações adicionais sobre a empresa..."
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
          {organization ? 'Salvar Alterações' : 'Criar Organização'}
        </Button>
      </div>
    </form>
  );
}
