import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Phase = 'idle' | 'researching' | 'generating' | 'done' | 'error';

interface ResearchResult {
  research_summary: string;
  citations: string[];
  subject: string;
  body: string;
}

interface ResearchParams {
  organizationId: string;
  recipientName?: string;
  emailType: string;
  customInstructions?: string;
  personId?: string;
}

export function useResearchAndGenerateEmail() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [researchSummary, setResearchSummary] = useState('');
  const [citations, setCitations] = useState<string[]>([]);

  const researchAndGenerate = async (params: ResearchParams): Promise<ResearchResult | null> => {
    try {
      setPhase('researching');
      setResearchSummary('');
      setCitations([]);

      // Small delay so UI shows "researching" before the call
      await new Promise((r) => setTimeout(r, 100));

      setPhase('generating');

      const { data, error } = await supabase.functions.invoke('research-company', {
        body: params,
      });

      if (error) {
        console.error('Research error:', error);
        toast.error('Erro na pesquisa: ' + (error.message || 'Tente novamente'));
        setPhase('error');
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        setPhase('error');
        return null;
      }

      setResearchSummary(data.research_summary || '');
      setCitations(data.citations || []);
      setPhase('done');

      toast.success('Email personalizado gerado com sucesso!');
      return data as ResearchResult;
    } catch (err) {
      console.error('Research error:', err);
      toast.error('Erro ao pesquisar empresa. Tente novamente.');
      setPhase('error');
      return null;
    }
  };

  const reset = () => {
    setPhase('idle');
    setResearchSummary('');
    setCitations([]);
  };

  return {
    phase,
    researchSummary,
    citations,
    researchAndGenerate,
    reset,
    isLoading: phase === 'researching' || phase === 'generating',
  };
}
