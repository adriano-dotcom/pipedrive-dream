import { useState, useMemo } from 'react';
import { GitMerge, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMergeOrganizations } from '@/hooks/useMergeOrganizations';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

interface MergeOrganizationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org1: Organization;
  org2: Organization;
  onSuccess: (keepOrgId: string) => void;
}

interface MergeField {
  key: keyof Organization;
  label: string;
  format?: (value: any) => string;
}

const MERGE_FIELDS: MergeField[] = [
  { key: 'name', label: 'Nome' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'cnae', label: 'CNAE' },
  { key: 'rntrc_antt', label: 'RNTRC/ANTT' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { 
    key: 'address_city', 
    label: 'Endereço',
    format: (value) => value || '-'
  },
  { key: 'label', label: 'Status' },
  { key: 'fleet_type', label: 'Tipo de Frota' },
  { 
    key: 'fleet_size', 
    label: 'Tamanho da Frota',
    format: (value) => value?.toString() || '-'
  },
  { key: 'current_insurer', label: 'Seguradora Atual' },
  { key: 'risk_profile', label: 'Perfil de Risco' },
  { 
    key: 'policy_renewal_month', 
    label: 'Mês de Renovação',
    format: (value) => {
      if (!value) return '-';
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return months[value - 1] || '-';
    }
  },
  { 
    key: 'annual_premium_estimate', 
    label: 'Prêmio Anual Estimado',
    format: (value) => value ? `R$ ${Number(value).toLocaleString('pt-BR')}` : '-'
  },
  { 
    key: 'has_claims_history', 
    label: 'Histórico de Sinistros',
    format: (value) => value === true ? 'Sim' : value === false ? 'Não' : '-'
  },
  { 
    key: 'automotores', 
    label: 'Automotores',
    format: (value) => value?.toString() || '-'
  },
];

export function MergeOrganizationsDialog({
  open,
  onOpenChange,
  org1,
  org2,
  onSuccess,
}: MergeOrganizationsDialogProps) {
  const { mergeOrganizations, isMerging } = useMergeOrganizations();

  // Estado para rastrear qual organização está selecionada para cada campo
  const [selections, setSelections] = useState<Record<string, 'org1' | 'org2'>>(() => {
    const initial: Record<string, 'org1' | 'org2'> = {};
    MERGE_FIELDS.forEach(field => {
      const val1 = org1[field.key];
      const val2 = org2[field.key];
      // Preferir valor não vazio
      if (val1 && !val2) {
        initial[field.key] = 'org1';
      } else if (!val1 && val2) {
        initial[field.key] = 'org2';
      } else {
        // Ambos têm valor ou ambos vazios - escolher o mais antigo
        initial[field.key] = new Date(org1.created_at) <= new Date(org2.created_at) ? 'org1' : 'org2';
      }
    });
    return initial;
  });

  // Determinar qual organização será mantida (a que tem mais campos selecionados)
  const keepOrgId = useMemo(() => {
    const org1Count = Object.values(selections).filter(v => v === 'org1').length;
    const org2Count = Object.values(selections).filter(v => v === 'org2').length;
    if (org1Count === org2Count) {
      return new Date(org1.created_at) <= new Date(org2.created_at) ? org1.id : org2.id;
    }
    return org1Count > org2Count ? org1.id : org2.id;
  }, [selections, org1, org2]);

  const keepOrg = keepOrgId === org1.id ? org1 : org2;
  const deleteOrg = keepOrgId === org1.id ? org2 : org1;

  const handleSelectionChange = (fieldKey: string, value: 'org1' | 'org2') => {
    setSelections(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleMerge = async () => {
    // Construir os dados mesclados
    const mergedData: Partial<Organization> = {};
    
    MERGE_FIELDS.forEach(field => {
      const selectedOrg = selections[field.key] === 'org1' ? org1 : org2;
      const value = selectedOrg[field.key];
      if (value !== undefined) {
        (mergedData as any)[field.key] = value;
      }
    });

    // Combinar endereços se o campo address_city foi escolhido
    const addressOrg = selections['address_city'] === 'org1' ? org1 : org2;
    mergedData.address_street = addressOrg.address_street;
    mergedData.address_number = addressOrg.address_number;
    mergedData.address_complement = addressOrg.address_complement;
    mergedData.address_neighborhood = addressOrg.address_neighborhood;
    mergedData.address_city = addressOrg.address_city;
    mergedData.address_state = addressOrg.address_state;
    mergedData.address_zipcode = addressOrg.address_zipcode;

    // Combinar arrays automaticamente (insurance_branches, preferred_insurers)
    const mergedBranches = [
      ...new Set([
        ...(org1.insurance_branches || []),
        ...(org2.insurance_branches || [])
      ])
    ];
    const mergedInsurers = [
      ...new Set([
        ...(org1.preferred_insurers || []),
        ...(org2.preferred_insurers || [])
      ])
    ];
    
    if (mergedBranches.length > 0) {
      mergedData.insurance_branches = mergedBranches;
    }
    if (mergedInsurers.length > 0) {
      mergedData.preferred_insurers = mergedInsurers;
    }

    // Concatenar notas se ambos tiverem
    const notes1 = org1.notes || '';
    const notes2 = org2.notes || '';
    if (notes1 && notes2 && notes1 !== notes2) {
      mergedData.notes = `${notes1}\n\n--- Notas de ${deleteOrg.name} ---\n${notes2}`;
    } else {
      mergedData.notes = notes1 || notes2;
    }

    // Concatenar broker_notes se ambos tiverem
    const brokerNotes1 = org1.broker_notes || '';
    const brokerNotes2 = org2.broker_notes || '';
    if (brokerNotes1 && brokerNotes2 && brokerNotes1 !== brokerNotes2) {
      mergedData.broker_notes = `${brokerNotes1}\n\n--- Notas de ${deleteOrg.name} ---\n${brokerNotes2}`;
    } else {
      mergedData.broker_notes = brokerNotes1 || brokerNotes2;
    }

    // Escolher primary_contact_id (preferir não nulo)
    if (org1.primary_contact_id && !org2.primary_contact_id) {
      mergedData.primary_contact_id = org1.primary_contact_id;
    } else if (!org1.primary_contact_id && org2.primary_contact_id) {
      mergedData.primary_contact_id = org2.primary_contact_id;
    } else {
      // Ambos têm ou nenhum tem - manter o da organização mantida
      mergedData.primary_contact_id = keepOrg.primary_contact_id;
    }

    try {
      await mergeOrganizations({
        keepOrgId,
        deleteOrgId: deleteOrg.id,
        deleteOrgName: deleteOrg.name,
        mergedData,
      });
      onSuccess(keepOrgId);
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const getDisplayValue = (field: MergeField, org: Organization) => {
    const value = org[field.key];
    
    // Special handling for address
    if (field.key === 'address_city') {
      const parts = [
        org.address_street,
        org.address_number,
        org.address_neighborhood,
        org.address_city,
        org.address_state
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : '-';
    }
    
    if (field.format) {
      return field.format(value);
    }
    return value || '-';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Mesclar Organizações
          </DialogTitle>
          <DialogDescription>
            Selecione qual valor manter para cada campo. A organização "{deleteOrg.name}" será excluída após a mesclagem.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Header com nomes */}
            <div className="grid grid-cols-[180px_1fr_1fr] gap-4 pb-2 border-b">
              <div className="font-medium text-sm text-muted-foreground">Campo</div>
              <div className="font-medium text-sm text-center">
                {org1.name}
                {keepOrgId === org1.id && (
                  <span className="ml-2 text-xs text-primary">(mantida)</span>
                )}
              </div>
              <div className="font-medium text-sm text-center">
                {org2.name}
                {keepOrgId === org2.id && (
                  <span className="ml-2 text-xs text-primary">(mantida)</span>
                )}
              </div>
            </div>

            {/* Campos */}
            {MERGE_FIELDS.map(field => {
              const val1 = getDisplayValue(field, org1);
              const val2 = getDisplayValue(field, org2);
              const hasValue1 = val1 !== '-';
              const hasValue2 = val2 !== '-';

              return (
                <div key={field.key} className="grid grid-cols-[180px_1fr_1fr] gap-4 items-center py-2 border-b border-border/50">
                  <div className="text-sm font-medium text-muted-foreground">{field.label}</div>
                  
                  <RadioGroup
                    value={selections[field.key]}
                    onValueChange={(value) => handleSelectionChange(field.key, value as 'org1' | 'org2')}
                    className="contents"
                  >
                    {/* Org 1 value */}
                    <Label
                      htmlFor={`${field.key}-org1`}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                        selections[field.key] === 'org1' 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      } ${!hasValue1 ? 'text-muted-foreground/50' : ''}`}
                    >
                      <RadioGroupItem value="org1" id={`${field.key}-org1`} />
                      <span className="text-sm truncate">{val1}</span>
                    </Label>

                    {/* Org 2 value */}
                    <Label
                      htmlFor={`${field.key}-org2`}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                        selections[field.key] === 'org2' 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      } ${!hasValue2 ? 'text-muted-foreground/50' : ''}`}
                    >
                      <RadioGroupItem value="org2" id={`${field.key}-org2`} />
                      <span className="text-sm truncate">{val2}</span>
                    </Label>
                  </RadioGroup>
                </div>
              );
            })}

            {/* Info sobre arrays combinados */}
            {((org1.insurance_branches?.length || 0) > 0 || (org2.insurance_branches?.length || 0) > 0) && (
              <div className="grid grid-cols-[180px_1fr] gap-4 items-center py-2 border-b border-border/50">
                <div className="text-sm font-medium text-muted-foreground">Ramos de Seguro</div>
                <div className="text-sm text-muted-foreground">
                  Serão combinados automaticamente: {[
                    ...new Set([
                      ...(org1.insurance_branches || []),
                      ...(org2.insurance_branches || [])
                    ])
                  ].join(', ') || '-'}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Alert variant="default" className="mt-4 border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            Notas, arquivos, atividades, negócios e pessoas vinculadas serão combinados automaticamente.
            <br />
            <strong className="text-warning">Esta ação não pode ser desfeita.</strong>
          </AlertDescription>
        </Alert>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMerging}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={isMerging}>
            {isMerging ? 'Mesclando...' : 'Mesclar Organizações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
