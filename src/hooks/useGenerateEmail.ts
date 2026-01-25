import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerateEmailParams {
  entityType: 'deal' | 'person' | 'organization';
  entityName: string;
  recipientName: string;
  context?: string;
  emailType?: 'proposal' | 'followup' | 'introduction' | 'custom';
}

interface GeneratedEmail {
  subject: string;
  body: string;
}

export function useGenerateEmail() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateEmail = async (params: GenerateEmailParams): Promise<GeneratedEmail | null> => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Você precisa estar logado para gerar emails');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Limite de requisições atingido. Tente novamente em alguns segundos.');
        }
        if (response.status === 402) {
          throw new Error('Créditos de IA esgotados. Adicione créditos ao workspace.');
        }
        throw new Error(result.error || 'Erro ao gerar email');
      }

      return {
        subject: result.subject,
        body: result.body,
      };
    } catch (error) {
      console.error('Error generating email:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar email');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateEmail,
    isGenerating,
  };
}
