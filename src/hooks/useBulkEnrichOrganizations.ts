import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationToEnrich {
  id: string;
  name: string;
  cnpj: string;
}

interface BulkEnrichError {
  orgName: string;
  error: string;
}

interface BulkEnrichState {
  isRunning: boolean;
  isComplete: boolean;
  total: number;
  current: number;
  currentOrg: string | null;
  successCount: number;
  errorCount: number;
  errors: BulkEnrichError[];
}

const initialState: BulkEnrichState = {
  isRunning: false,
  isComplete: false,
  total: 0,
  current: 0,
  currentOrg: null,
  successCount: 0,
  errorCount: 0,
  errors: [],
};

export function useBulkEnrichOrganizations() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<BulkEnrichState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState(initialState);
    abortRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setState(s => ({ ...s, isRunning: false, isComplete: true }));
  }, []);

  const startBulkEnrich = useCallback(async (organizations: OrganizationToEnrich[]) => {
    // Filter only organizations with CNPJ
    const orgsWithCnpj = organizations.filter(o => o.cnpj);
    
    if (orgsWithCnpj.length === 0) {
      return;
    }

    // Create new abort controller
    abortRef.current = new AbortController();

    // Reset and start
    setState({
      isRunning: true,
      isComplete: false,
      total: orgsWithCnpj.length,
      current: 0,
      currentOrg: null,
      successCount: 0,
      errorCount: 0,
      errors: [],
    });

    for (let i = 0; i < orgsWithCnpj.length; i++) {
      // Check if cancelled
      if (abortRef.current?.signal.aborted) {
        break;
      }

      const org = orgsWithCnpj[i];

      // Update current progress
      setState(s => ({
        ...s,
        current: i + 1,
        currentOrg: org.name,
      }));

      try {
        const { data, error } = await supabase.functions.invoke('enrich-organization', {
          body: { organizationId: org.id, cnpj: org.cnpj },
        });

        if (error) {
          throw new Error(error.message || 'Erro ao enriquecer dados');
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        setState(s => ({
          ...s,
          successCount: s.successCount + 1,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setState(s => ({
          ...s,
          errorCount: s.errorCount + 1,
          errors: [...s.errors, { orgName: org.name, error: errorMessage }],
        }));
      }

      // Small delay between requests (500ms) to avoid rate limiting
      if (i < orgsWithCnpj.length - 1 && !abortRef.current?.signal.aborted) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Mark as complete
    setState(s => ({
      ...s,
      isRunning: false,
      isComplete: true,
      currentOrg: null,
    }));

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
  }, [queryClient]);

  return {
    ...state,
    startBulkEnrich,
    cancel,
    reset,
  };
}
