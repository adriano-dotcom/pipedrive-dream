import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GitMerge, AlertTriangle, Building2 } from 'lucide-react';
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
import { useMergeContacts } from '@/hooks/useMergeContacts';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface PersonWithOrg extends Person {
  organizations?: {
    id: string;
    name: string;
    cnpj: string | null;
    address_city: string | null;
    address_state: string | null;
    automotores: number | null;
  } | null;
}

interface MergeContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person1: PersonWithOrg;
  person2: PersonWithOrg;
  onSuccess: (keepPersonId: string) => void;
}

interface MergeField {
  key: keyof Person;
  label: string;
  format?: (value: any, person: PersonWithOrg) => string;
}

const MERGE_FIELDS: MergeField[] = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'cpf', label: 'CPF' },
  { key: 'job_title', label: 'Cargo' },
  { 
    key: 'organization_id', 
    label: 'Organização',
    format: (value, person) => person.organizations?.name || '-'
  },
  { key: 'label', label: 'Status' },
  { key: 'lead_source', label: 'Origem do Lead' },
  { key: 'utm_source', label: 'UTM Source' },
  { key: 'utm_medium', label: 'UTM Medium' },
  { key: 'utm_campaign', label: 'UTM Campaign' },
];

export function MergeContactsDialog({
  open,
  onOpenChange,
  person1,
  person2,
  onSuccess,
}: MergeContactsDialogProps) {
  const { mergeContacts, isMerging } = useMergeContacts();

  // Estado para rastrear qual pessoa está selecionada para cada campo
  // 'person1' ou 'person2'
  const [selections, setSelections] = useState<Record<string, 'person1' | 'person2'>>(() => {
    const initial: Record<string, 'person1' | 'person2'> = {};
    MERGE_FIELDS.forEach(field => {
      const val1 = person1[field.key];
      const val2 = person2[field.key];
      // Preferir valor não vazio, senão person1
      if (val1 && !val2) {
        initial[field.key] = 'person1';
      } else if (!val1 && val2) {
        initial[field.key] = 'person2';
      } else {
        // Ambos têm valor ou ambos vazios - escolher o mais antigo (person1 se for o mais velho)
        initial[field.key] = new Date(person1.created_at) <= new Date(person2.created_at) ? 'person1' : 'person2';
      }
    });
    return initial;
  });

  // Determinar qual contato será mantido (o que tem mais campos selecionados)
  const keepPersonId = useMemo(() => {
    const person1Count = Object.values(selections).filter(v => v === 'person1').length;
    const person2Count = Object.values(selections).filter(v => v === 'person2').length;
    // Se empate, manter o mais antigo
    if (person1Count === person2Count) {
      return new Date(person1.created_at) <= new Date(person2.created_at) ? person1.id : person2.id;
    }
    return person1Count > person2Count ? person1.id : person2.id;
  }, [selections, person1, person2]);

  const keepPerson = keepPersonId === person1.id ? person1 : person2;
  const deletePerson = keepPersonId === person1.id ? person2 : person1;

  const handleSelectionChange = (fieldKey: string, value: 'person1' | 'person2') => {
    setSelections(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleMerge = async () => {
    // Construir os dados mesclados
    const mergedData: Partial<Person> = {};
    
    MERGE_FIELDS.forEach(field => {
      const selectedPerson = selections[field.key] === 'person1' ? person1 : person2;
      const value = selectedPerson[field.key];
      if (value !== undefined) {
        (mergedData as any)[field.key] = value;
      }
    });

    // Concatenar notas se ambos tiverem
    const notes1 = person1.notes || '';
    const notes2 = person2.notes || '';
    if (notes1 && notes2 && notes1 !== notes2) {
      mergedData.notes = `${notes1}\n\n--- Notas de ${deletePerson.name} ---\n${notes2}`;
    } else {
      mergedData.notes = notes1 || notes2;
    }

    try {
      await mergeContacts({
        keepPersonId,
        deletePersonId: deletePerson.id,
        deletePersonName: deletePerson.name,
        mergedData,
      });
      onSuccess(keepPersonId);
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const getDisplayValue = (field: MergeField, person: PersonWithOrg) => {
    const value = person[field.key];
    if (field.format) {
      return field.format(value, person);
    }
    return value || '-';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Mesclar Contatos
          </DialogTitle>
          <DialogDescription>
            Selecione qual valor manter para cada campo. O contato "{deletePerson.name}" será excluído após a mesclagem.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Header com nomes */}
            <div className="grid grid-cols-[180px_1fr_1fr] gap-4 pb-2 border-b">
              <div className="font-medium text-sm text-muted-foreground">Campo</div>
              <div className="font-medium text-sm text-center">
                {person1.name}
                {keepPersonId === person1.id && (
                  <span className="ml-2 text-xs text-primary">(mantido)</span>
                )}
              </div>
              <div className="font-medium text-sm text-center">
                {person2.name}
                {keepPersonId === person2.id && (
                  <span className="ml-2 text-xs text-primary">(mantido)</span>
                )}
              </div>
            </div>

            {/* Campos */}
            {MERGE_FIELDS.map(field => {
              const val1 = getDisplayValue(field, person1);
              const val2 = getDisplayValue(field, person2);
              const hasValue1 = val1 !== '-';
              const hasValue2 = val2 !== '-';

              return (
                <div key={field.key} className="grid grid-cols-[180px_1fr_1fr] gap-4 items-center py-2 border-b border-border/50">
                  <div className="text-sm font-medium text-muted-foreground">{field.label}</div>
                  
                  <RadioGroup
                    value={selections[field.key]}
                    onValueChange={(value) => handleSelectionChange(field.key, value as 'person1' | 'person2')}
                    className="contents"
                  >
                    {/* Person 1 value */}
                    <Label
                      htmlFor={`${field.key}-person1`}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                        selections[field.key] === 'person1' 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      } ${!hasValue1 ? 'text-muted-foreground/50' : ''}`}
                    >
                      <RadioGroupItem value="person1" id={`${field.key}-person1`} />
                      <span className="text-sm truncate">{val1}</span>
                    </Label>

                    {/* Person 2 value */}
                    <Label
                      htmlFor={`${field.key}-person2`}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                        selections[field.key] === 'person2' 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      } ${!hasValue2 ? 'text-muted-foreground/50' : ''}`}
                    >
                      <RadioGroupItem value="person2" id={`${field.key}-person2`} />
                      <span className="text-sm truncate">{val2}</span>
                    </Label>
                  </RadioGroup>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Alert variant="default" className="mt-4 border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            Notas, arquivos, atividades e negócios serão combinados automaticamente.
            <br />
            <strong className="text-warning">Esta ação não pode ser desfeita.</strong>
          </AlertDescription>
        </Alert>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMerging}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={isMerging}>
            {isMerging ? 'Mesclando...' : 'Mesclar Contatos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
