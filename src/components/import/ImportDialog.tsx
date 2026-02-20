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
  splitAndDeduplicatePhones,
  toTitleCase,
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
      let allData: { id: string; email: string | null; cpf: string | null; pipedrive_id: string | null }[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from('people')
          .select('id, email, cpf, pipedrive_id')
          .range(from, from + pageSize - 1);
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    enabled: open && step >= 3,
  });

  const { data: existingOrgs } = useQuery({
    queryKey: ['organizations-for-import'],
    queryFn: async () => {
      let allData: { id: string; name: string; cnpj: string | null; pipedrive_id: string | null }[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from('organizations')
          .select('id, name, cnpj, pipedrive_id')
          .range(from, from + pageSize - 1);
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
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

  // Helper: find or create a tag
  const findOrCreateTag = async (
    tagName: string,
    table: 'person_tags' | 'organization_tags',
    userId: string
  ): Promise<string> => {
    const trimmed = tagName.trim();
    if (!trimmed) throw new Error('Tag name empty');

    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .ilike('name', trimmed)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from(table)
      .insert({ name: trimmed, created_by: userId })
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  };

  // Perform import
  const performImport = async () => {
    if (!user) return;

    const selectedRows = importRows.filter(r => r.selected);
    setIsImporting(true);
    setImportProgress(0);
    setImportResults([]);

    const results: ImportResult[] = [];
    const orgCache = new Map<string, string>(); // key -> org ID
    const tagCache = new Map<string, string>(); // "table:name" -> tag ID

    // Helper to get or create tag with cache
    const getCachedTag = async (tagName: string, table: 'person_tags' | 'organization_tags') => {
      const cacheKey = `${table}:${tagName.trim().toLowerCase()}`;
      if (tagCache.has(cacheKey)) return tagCache.get(cacheKey)!;
      const tagId = await findOrCreateTag(tagName, table, user.id);
      tagCache.set(cacheKey, tagId);
      return tagId;
    };

    // Build in-memory indices from pre-fetched data for fast duplicate checking
    const orgByPipedriveId = new Map<string, string>();
    const orgByCnpj = new Map<string, string>();
    const orgByName = new Map<string, string>();

    existingOrgs?.forEach(org => {
      if (org.pipedrive_id) orgByPipedriveId.set(org.pipedrive_id, org.id);
      if (org.cnpj) orgByCnpj.set(org.cnpj.replace(/\D/g, ''), org.id);
      if (org.name) orgByName.set(org.name.toLowerCase(), org.id);
    });

    const personByPipedriveId = new Map<string, string>();
    const personByEmail = new Map<string, string>();
    const personByCpf = new Map<string, string>();

    existingPeople?.forEach(p => {
      if (p.pipedrive_id) personByPipedriveId.set(p.pipedrive_id, p.id);
      if (p.email) personByEmail.set(p.email.toLowerCase(), p.id);
      if (p.cpf) personByCpf.set(p.cpf.replace(/\D/g, ''), p.id);
    });

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      const { mappedData } = row;

      try {
        // Parse org_address if present and city/state not already set
        if (mappedData.org_address && !mappedData.address_city) {
          const parts = mappedData.org_address.split(',').map(p => p.trim());
          if (parts[0]) mappedData.address_city = parts[0];
          if (parts[1]) mappedData.address_state = parts[1];
        }

        let organizationId: string | null = null;

        // Handle organization if present
        if (mappedData.org_name || mappedData.cnpj || mappedData.pipedrive_id) {
          const cnpjClean = mappedData.cnpj?.replace(/\D/g, '') || '';
          const orgName = toTitleCase(mappedData.org_name || '');
          const cacheKey = mappedData.pipedrive_id || cnpjClean || orgName.toLowerCase();

          // Check cache first
          if (orgCache.has(cacheKey)) {
            organizationId = orgCache.get(cacheKey)!;
          } else {
            // Check in-memory indices (no DB queries)
            let existingOrgId: string | null = null;
            if (mappedData.pipedrive_id) {
              existingOrgId = orgByPipedriveId.get(mappedData.pipedrive_id) || null;
            }
            if (!existingOrgId && cnpjClean) {
              existingOrgId = orgByCnpj.get(cnpjClean) || null;
            }
            if (!existingOrgId && orgName) {
              existingOrgId = orgByName.get(orgName.toLowerCase()) || null;
            }

            if (existingOrgId) {
              organizationId = existingOrgId;
              
              // Update org data
              const updateData: any = {};
              if (cnpjClean) updateData.cnpj = cnpjClean;
              if (mappedData.pipedrive_id) updateData.pipedrive_id = mappedData.pipedrive_id;
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
                  pipedrive_id: mappedData.pipedrive_id || null,
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

              // Update in-memory indices for subsequent rows
              if (cnpjClean) orgByCnpj.set(cnpjClean, newOrg.id);
              if (orgName) orgByName.set(orgName.toLowerCase(), newOrg.id);
              if (mappedData.pipedrive_id) orgByPipedriveId.set(mappedData.pipedrive_id, newOrg.id);

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

          // Handle org tags
          if (organizationId && mappedData.org_tags) {
            const tagNames = mappedData.org_tags.split(',').map(t => t.trim()).filter(Boolean);
            for (const tagName of tagNames) {
              try {
                const tagId = await getCachedTag(tagName, 'organization_tags');
                // Check if assignment already exists
                const { data: existingAssignment } = await supabase
                  .from('organization_tag_assignments')
                  .select('id')
                  .eq('organization_id', organizationId)
                  .eq('tag_id', tagId)
                  .maybeSingle();
                if (!existingAssignment) {
                  await supabase
                    .from('organization_tag_assignments')
                    .insert({ organization_id: organizationId, tag_id: tagId });
                }
              } catch (e) {
                console.warn('Error assigning org tag:', tagName, e);
              }
            }
          }
        }

        // Handle person - combine first_name + last_name if name is not present
        let personName = toTitleCase(mappedData.name || '');
        if (!personName && (mappedData.first_name || mappedData.last_name)) {
          personName = [toTitleCase(mappedData.first_name || ''), toTitleCase(mappedData.last_name || '')]
            .filter(Boolean)
            .join(' ')
            .trim();
        }
        
        if (!personName) {
          throw new Error('Nome é obrigatório');
        }

        // Split and deduplicate phones before saving
        const uniquePhones = splitAndDeduplicatePhones(mappedData.phone || '');
        if (uniquePhones.length > 0) {
          mappedData.phone = uniquePhones[0];
          if (uniquePhones.length > 1 && !mappedData.whatsapp) {
            mappedData.whatsapp = uniquePhones[1];
          }
        }
        const uniqueWhatsapp = splitAndDeduplicatePhones(mappedData.whatsapp || '');
        if (uniqueWhatsapp.length > 0) {
          mappedData.whatsapp = uniqueWhatsapp[0];
        }

        const emailLower = mappedData.email?.toLowerCase();
        const cpfClean = mappedData.cpf?.replace(/\D/g, '');
        const personPipedriveId = mappedData.person_pipedrive_id;

        // Check person in-memory indices (no DB queries)
        let existingPerson: { id: string } | null = null;

        if (personPipedriveId) {
          const id = personByPipedriveId.get(personPipedriveId);
          if (id) existingPerson = { id };
        }
        if (!existingPerson && emailLower) {
          const id = personByEmail.get(emailLower);
          if (id) existingPerson = { id };
        }
        if (!existingPerson && cpfClean) {
          const id = personByCpf.get(cpfClean);
          if (id) existingPerson = { id };
        }

        let personId: string;

        if (existingPerson) {
          personId = existingPerson.id;
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
          if (personPipedriveId) updateData.pipedrive_id = personPipedriveId;

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
          const { data: insertedPerson, error: insertError } = await supabase
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
              pipedrive_id: personPipedriveId || null,
              organization_id: organizationId,
              created_by: user.id,
              owner_id: user.id,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          personId = insertedPerson.id;

          // Update in-memory indices for subsequent rows
          if (personPipedriveId) personByPipedriveId.set(personPipedriveId, personId);
          if (emailLower) personByEmail.set(emailLower, personId);
          if (cpfClean) personByCpf.set(cpfClean, personId);

          results.push({
            success: true,
            name: personName,
            type: 'person',
            action: 'created',
          });
        }

        // Handle person tags
        if (personId && mappedData.person_tags) {
          const tagNames = mappedData.person_tags.split(',').map(t => t.trim()).filter(Boolean);
          for (const tagName of tagNames) {
            try {
              const tagId = await getCachedTag(tagName, 'person_tags');
              const { data: existingAssignment } = await supabase
                .from('person_tag_assignments')
                .select('id')
                .eq('person_id', personId)
                .eq('tag_id', tagId)
                .maybeSingle();
              if (!existingAssignment) {
                await supabase
                  .from('person_tag_assignments')
                  .insert({ person_id: personId, tag_id: tagId });
              }
            } catch (e) {
              console.warn('Error assigning person tag:', tagName, e);
            }
          }
        }
      } catch (error) {
        console.error(`[Import] Erro na linha ${row.index + 2}:`, error);
        results.push({
          success: false,
          name: row.mappedData.name || row.mappedData.org_name || `Linha ${row.index + 2}`,
          type: 'person',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }

      setImportProgress(Math.round(((i + 1) / selectedRows.length) * 100));
      setImportResults([...results]);

      // Pause every 50 rows to keep browser responsive
      if ((i + 1) % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setIsImporting(false);
    
    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ['people'] });
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['person-tags'] });
    queryClient.invalidateQueries({ queryKey: ['organization-tags'] });
    queryClient.invalidateQueries({ queryKey: ['person-tag-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['organization-tag-assignments'] });

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
        // Allow to proceed if name OR (first_name/last_name) is mapped
        const hasName = Object.values(mapping).includes('name');
        const hasFirstOrLastName = Object.values(mapping).includes('first_name') || Object.values(mapping).includes('last_name');
        return hasName || hasFirstOrLastName;
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
      <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
