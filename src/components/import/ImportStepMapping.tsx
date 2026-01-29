import { useMemo } from 'react';
import { ArrowRight, Check, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_IMPORT_FIELDS, PERSON_FIELDS, ORGANIZATION_FIELDS, type ParsedRow } from '@/lib/import';

interface ImportStepMappingProps {
  headers: string[];
  mapping: Record<string, string>;
  onMappingChange: (header: string, fieldId: string) => void;
  previewData: ParsedRow[];
}

export function ImportStepMapping({
  headers,
  mapping,
  onMappingChange,
  previewData,
}: ImportStepMappingProps) {
  const hasRequiredField = useMemo(() => {
    return Object.values(mapping).includes('name');
  }, [mapping]);

  const usedFields = useMemo(() => {
    return new Set(Object.values(mapping).filter(Boolean));
  }, [mapping]);

  return (
    <div className="space-y-6">
      {/* Info Message */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 text-sm">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Mapeie as colunas do seu arquivo</p>
          <p className="text-muted-foreground mt-1">
            Associe cada coluna do arquivo ao campo correspondente no sistema. 
            Linhas com dados de empresa serão automaticamente vinculadas ao contato.
          </p>
        </div>
      </div>

      {/* Required Field Warning */}
      {!hasRequiredField && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>O campo "Nome da Pessoa" é obrigatório. Mapeie uma coluna para ele.</span>
        </div>
      )}

      {/* Mapping Grid */}
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {headers.map((header) => {
            const currentValue = mapping[header] || '';
            const fieldInfo = ALL_IMPORT_FIELDS.find(f => f.id === currentValue);
            const isRequired = fieldInfo?.required;
            
            return (
              <div
                key={header}
                className="flex items-center gap-4 p-3 rounded-lg bg-card border border-border/50"
              >
                {/* Source Column */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={header}>
                    "{header}"
                  </p>
                  {previewData[0] && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      Ex: {previewData[0][header] || '(vazio)'}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                {/* Target Field */}
                <div className="w-[200px] flex-shrink-0">
                  <Select
                    value={currentValue}
                    onValueChange={(value) => onMappingChange(header, value)}
                  >
                    <SelectTrigger className={currentValue ? 'border-primary/50' : ''}>
                      <SelectValue placeholder="Selecionar campo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        <span className="text-muted-foreground">Ignorar coluna</span>
                      </SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Pessoa
                      </div>
                      {PERSON_FIELDS.map((field) => (
                        <SelectItem 
                          key={field.id} 
                          value={field.id}
                          disabled={usedFields.has(field.id) && mapping[header] !== field.id}
                        >
                          <span className="flex items-center gap-2">
                            {field.label}
                            {field.required && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                Obrigatório
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                        Empresa
                      </div>
                      {ORGANIZATION_FIELDS.map((field) => (
                        <SelectItem 
                          key={field.id} 
                          value={field.id}
                          disabled={usedFields.has(field.id) && mapping[header] !== field.id}
                        >
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Icon */}
                <div className="w-6 flex-shrink-0">
                  {currentValue && (
                    <Check className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
        <span>{headers.length} colunas no arquivo</span>
        <span>{Object.values(mapping).filter(Boolean).length} mapeadas</span>
      </div>
    </div>
  );
}
