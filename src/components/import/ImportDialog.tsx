import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImportStepUpload } from './ImportStepUpload';
import { ImportStepMapping } from './ImportStepMapping';
import { ImportStepPreview } from './ImportStepPreview';
import { ImportStepProgress } from './ImportStepProgress';
import {
  parseCSV,
  parseExcel,
  autoDetectMapping,
  validateRow,
  type ParsedRow,
  type ImportRow,
  parseNumber,
} from '@/lib/import';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'people' | 'organizations';
}

interface ImportResult {
  success: boolean;
  name: string;
  type: 'person' | 'organization';
  error?: string;
  action?: 'created' | 'updated';
}

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Mapeamento' },
  { id: 3, label: 'Preview' },
  { id: 4, label: 'Importar' },
];

export function ImportDialog({ open, onOpenChange, defaultType }: ImportDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

  // Fetch existing records for duplicate checking
  const { data: existingPeople } = useQuery({
    queryKey: ['people-for-import'],
    queryFn: async () => {
      const { data } = await supabase
        .from('people')
        .select('id, email, cpf');
      return data || [];
    },
    enabled: open && step >= 3,
  });

  const { data: existingOrgs } = useQuery({
    queryKey: ['organizations-for-import'],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, cnpj');
      return data || [];
    },
    enabled: open && step >= 3,
  });

  const existingEmails = useMemo(() => {
    return new Set(existingPeople?.map(p => p.email?.toLowerCase()).filter(Boolean) || []);
  }, [existingPeople]);

  const existingCpfs = useMemo(() => {
    return new Set(existingPeople?.map(p => p.cpf?.replace(/\D/g, '')).filter(Boolean) || []);
  }, [existingPeople]);

  const existingCnpjs = useMemo(() => {
    return new Set(existingOrgs?.map(o => o.cnpj?.replace(/\D/g, '')).filter(Boolean) || []);
  }, [existingOrgs]);

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep(1);
      setFile(null);
      setRawData([]);
      setHeaders([]);
      setMapping({});
      setImportRows([]);
      setParseError(null);
      setIsImporting(false);
      setImportProgress(0);
      setImportResults([]);
    }
    onOpenChange(open);
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setIsParsingFile(true);

    try {
      const isExcel = selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx');
      const data = isExcel ? await parseExcel(selectedFile) : await parseCSV(selectedFile);

      if (data.length === 0) {
        throw new Error('Nenhum dado encontrado no arquivo');
      }

      const fileHeaders = Object.keys(data[0]);
      setRawData(data);
      setHeaders(fileHeaders);
      
      // Auto-detect mapping
      const autoMapping = autoDetectMapping(fileHeaders);
      setMapping(autoMapping);
      
      setStep(2);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsParsingFile(false);
    }
  }, []);

  // Handle mapping change
  const handleMappingChange = useCallback((header: string, fieldId: string) => {
    setMapping(prev => {
      const newMapping = { ...prev };
      if (fieldId) {
        newMapping[header] = fieldId;
      } else {
        delete newMapping[header];
      }
      return newMapping;
    });
  }, []);

  // Prepare preview data
  const preparePreviewData = useCallback(() => {
    const rows: ImportRow[] = rawData.map((row, index) => {
      // Map raw data to field IDs
      const mappedData: Record<string, string> = {};
      Object.entries(mapping).forEach(([header, fieldId]) => {
        if (fieldId && row[header]) {
          mappedData[fieldId] = row[header];
        }
      });

      // Validate row
      const validation = validateRow(mappedData);
      
      let status: ImportRow['status'] = 'valid';
      const messages: string[] = [...validation.errors, ...validation.warnings];

      if (validation.errors.length > 0) {
        status = 'error';
      } else if (validation.warnings.length > 0) {
        status = 'warning';
      }

      // Check for duplicates
      if (mappedData.email && existingEmails.has(mappedData.email.toLowerCase())) {
        status = status === 'error' ? 'error' : 'warning';
      }
      if (mappedData.cpf && existingCpfs.has(mappedData.cpf.replace(/\D/g, ''))) {
        status = status === 'error' ? 'error' : 'warning';
      }

      return {
        index,
        data: row,
        mappedData,
        status,
        messages,
        selected: status !== 'error',
      };
    });

    setImportRows(rows);
  }, [rawData, mapping, existingEmails, existingCpfs]);

  // Toggle row selection
  const handleToggleRow = useCallback((index: number) => {
    setImportRows(prev =>
      prev.map(row =>
        row.index === index ? { ...row, selected: !row.selected } : row
      )
    );
  }, []);

  // Toggle all rows
  const handleToggleAll = useCallback((selected: boolean) => {
    setImportRows(prev =>
      prev.map(row => ({
        ...row,
        selected: row.status !== 'error' ? selected : false,
      }))
    );
  }, []);

  // Perform import
  const performImport = async () => {
    if (!user) return;

    const selectedRows = importRows.filter(r => r.selected);
    setIsImporting(true);
    setImportProgress(0);
    setImportResults([]);

    const results: ImportResult[] = [];
    const orgCache = new Map<string, string>(); // CNPJ/name -> org ID

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      const { mappedData } = row;

      try {
        let organizationId: string | null = null;

        // Handle organization if present
        if (mappedData.org_name || mappedData.cnpj) {
          const cnpjClean = mappedData.cnpj?.replace(/\D/g, '') || '';
          const orgName = mappedData.org_name || '';
          const cacheKey = cnpjClean || orgName.toLowerCase();

          // Check cache first
          if (orgCache.has(cacheKey)) {
            organizationId = orgCache.get(cacheKey)!;
          } else {
            // Check if org exists
            let existingOrg = null;
            
            if (cnpjClean) {
              const { data } = await supabase
                .from('organizations')
                .select('id')
                .eq('cnpj', cnpjClean)
                .maybeSingle();
              existingOrg = data;
            }
            
            if (!existingOrg && orgName) {
              const { data } = await supabase
                .from('organizations')
                .select('id')
                .ilike('name', orgName)
                .maybeSingle();
              existingOrg = data;
            }

            if (existingOrg) {
              organizationId = existingOrg.id;
              
              // Update org data
              const updateData: any = {};
              if (cnpjClean) updateData.cnpj = cnpjClean;
              if (mappedData.org_phone) updateData.phone = mappedData.org_phone;
              if (mappedData.org_email) updateData.email = mappedData.org_email;
              if (mappedData.automotores) updateData.automotores = parseNumber(mappedData.automotores);
              if (mappedData.address_city) updateData.address_city = mappedData.address_city;
              if (mappedData.address_state) updateData.address_state = mappedData.address_state;
              if (mappedData.address_zipcode) updateData.address_zipcode = mappedData.address_zipcode;

              if (Object.keys(updateData).length > 0) {
                await supabase
                  .from('organizations')
                  .update(updateData)
                  .eq('id', organizationId);
              }

              results.push({
                success: true,
                name: orgName || cnpjClean,
                type: 'organization',
                action: 'updated',
              });
            } else if (orgName) {
              // Create new org
              const { data: newOrg, error: orgError } = await supabase
                .from('organizations')
                .insert({
                  name: orgName,
                  cnpj: cnpjClean || null,
                  phone: mappedData.org_phone || null,
                  email: mappedData.org_email || null,
                  automotores: parseNumber(mappedData.automotores),
                  address_city: mappedData.address_city || null,
                  address_state: mappedData.address_state || null,
                  address_zipcode: mappedData.address_zipcode || null,
                  created_by: user.id,
                  owner_id: user.id,
                })
                .select('id')
                .single();

              if (orgError) throw orgError;
              
              organizationId = newOrg.id;
              results.push({
                success: true,
                name: orgName,
                type: 'organization',
                action: 'created',
              });
            }

            if (organizationId && cacheKey) {
              orgCache.set(cacheKey, organizationId);
            }
          }
        }

        // Handle person
        const personName = mappedData.name;
        if (!personName) {
          throw new Error('Nome é obrigatório');
        }

        const emailLower = mappedData.email?.toLowerCase();
        const cpfClean = mappedData.cpf?.replace(/\D/g, '');

        // Check if person exists
        let existingPerson = null;
        
        if (emailLower) {
          const { data } = await supabase
            .from('people')
            .select('id')
            .ilike('email', emailLower)
            .maybeSingle();
          existingPerson = data;
        }
        
        if (!existingPerson && cpfClean) {
          const { data } = await supabase
            .from('people')
            .select('id')
            .eq('cpf', cpfClean)
            .maybeSingle();
          existingPerson = data;
        }

        if (existingPerson) {
          // Update existing person
          const updateData: any = {
            name: personName,
            organization_id: organizationId,
          };
          if (mappedData.email) updateData.email = mappedData.email;
          if (cpfClean) updateData.cpf = cpfClean;
          if (mappedData.phone) updateData.phone = mappedData.phone;
          if (mappedData.whatsapp) updateData.whatsapp = mappedData.whatsapp;
          if (mappedData.job_title) updateData.job_title = mappedData.job_title;
          if (mappedData.notes) updateData.notes = mappedData.notes;
          if (mappedData.label) updateData.label = mappedData.label;
          if (mappedData.lead_source) updateData.lead_source = mappedData.lead_source;

          const { error: updateError } = await supabase
            .from('people')
            .update(updateData)
            .eq('id', existingPerson.id);

          if (updateError) throw updateError;

          results.push({
            success: true,
            name: personName,
            type: 'person',
            action: 'updated',
          });
        } else {
          // Create new person
          const { error: insertError } = await supabase
            .from('people')
            .insert({
              name: personName,
              email: mappedData.email || null,
              cpf: cpfClean || null,
              phone: mappedData.phone || null,
              whatsapp: mappedData.whatsapp || null,
              job_title: mappedData.job_title || null,
              notes: mappedData.notes || null,
              label: mappedData.label || null,
              lead_source: mappedData.lead_source || null,
              organization_id: organizationId,
              created_by: user.id,
              owner_id: user.id,
            });

          if (insertError) throw insertError;

          results.push({
            success: true,
            name: personName,
            type: 'person',
            action: 'created',
          });
        }
      } catch (error) {
        results.push({
          success: false,
          name: row.mappedData.name || `Linha ${row.index + 2}`,
          type: 'person',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }

      setImportProgress(Math.round(((i + 1) / selectedRows.length) * 100));
      setImportResults([...results]);
    }

    setIsImporting(false);
    
    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ['people'] });
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      toast.success(`${successCount} registro(s) importado(s) com sucesso!`);
    }
  };

  // Navigation
  const canGoNext = useMemo(() => {
    switch (step) {
      case 1:
        return false; // Auto-advances on file select
      case 2:
        return Object.values(mapping).includes('name');
      case 3:
        return importRows.some(r => r.selected);
      default:
        return false;
    }
  }, [step, mapping, importRows]);

  const handleNext = () => {
    if (step === 2) {
      preparePreviewData();
    }
    if (step === 3) {
      performImport();
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Contatos e Empresas</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  step >= s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {s.id}
              </div>
              <span
                className={cn(
                  "text-sm hidden sm:inline",
                  step >= s.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1",
                    step > s.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-1 py-2">
          {step === 1 && (
            <ImportStepUpload
              onFileSelect={handleFileSelect}
              isLoading={isParsingFile}
              error={parseError}
            />
          )}

          {step === 2 && (
            <ImportStepMapping
              headers={headers}
              mapping={mapping}
              onMappingChange={handleMappingChange}
              previewData={rawData.slice(0, 5)}
            />
          )}

          {step === 3 && (
            <ImportStepPreview
              rows={importRows}
              onToggleRow={handleToggleRow}
              onToggleAll={handleToggleAll}
              existingEmails={existingEmails}
              existingCpfs={existingCpfs}
              existingCnpjs={existingCnpjs}
            />
          )}

          {step === 4 && (
            <ImportStepProgress
              isImporting={isImporting}
              progress={importProgress}
              results={importResults}
              totalRows={importRows.filter(r => r.selected).length}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={step === 1 ? handleClose : handleBack}
            >
              {step === 1 ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </>
              )}
            </Button>

            {step > 1 && (
              <Button onClick={handleNext} disabled={!canGoNext}>
                {step === 3 ? 'Importar' : 'Próximo'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
