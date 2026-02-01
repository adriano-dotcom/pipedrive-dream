import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CasaDadosResponse {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  porte_empresa?: { descricao?: string };
  matriz_filial?: string;
  codigo_natureza_juridica?: string;
  descricao_natureza_juridica?: string;
  data_abertura?: string;
  capital_social?: number;
  situacao_cadastral?: {
    situacao_cadastral?: string;
    data?: string;
  };
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
    ibge?: {
      latitude?: number;
      longitude?: number;
    };
  };
  quadro_societario?: Array<{
    nome?: string;
    cpf_cnpj?: string;
    qualificacao?: string;
    codigo_qualificacao?: number;
    data_entrada?: string;
    pais?: string;
    representante_legal?: {
      nome?: string;
      cpf?: string;
      qualificacao?: string;
    };
  }>;
  telefones?: string[];
  emails?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const casaDadosApiKey = Deno.env.get('CASA_DOS_DADOS_API_KEY');

    if (!casaDadosApiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key da Casa dos Dados não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = claims.claims.sub;

    // Parse request body
    const { organizationId, cnpj: providedCnpj } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch organization if CNPJ not provided
    let cnpj = providedCnpj;
    if (!cnpj) {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('cnpj')
        .eq('id', organizationId)
        .single();

      if (orgError || !org) {
        return new Response(
          JSON.stringify({ error: 'Organização não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      cnpj = org.cnpj;
    }

    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'CNPJ não cadastrado na organização. Por favor, cadastre o CNPJ primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean CNPJ (remove formatting)
    const cleanCnpj = cnpj.replace(/\D/g, '');

    // Validate CNPJ format (14 digits)
    if (cleanCnpj.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'CNPJ inválido. O CNPJ deve conter 14 dígitos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enrich-organization] Buscando dados para CNPJ: ${cleanCnpj}`);

    // Call Casa dos Dados API
    const apiResponse = await fetch(`https://api.casadosdados.com.br/v4/cnpj/${cleanCnpj}`, {
      method: 'GET',
      headers: {
        'api-key': casaDadosApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (apiResponse.status === 401) {
      return new Response(
        JSON.stringify({ error: 'API Key inválida. Por favor, verifique a configuração.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (apiResponse.status === 403) {
      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes na API Casa dos Dados.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (apiResponse.status === 404) {
      return new Response(
        JSON.stringify({ error: 'Empresa não localizada na Receita Federal.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`[enrich-organization] Erro na API: ${apiResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Erro na consulta: ${apiResponse.statusText}` }),
        { status: apiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiData: CasaDadosResponse = await apiResponse.json();
    console.log('[enrich-organization] Dados recebidos da API:', JSON.stringify(apiData, null, 2).substring(0, 500));

    // Parse founded_date
    let foundedDate: string | null = null;
    if (apiData.data_abertura) {
      // Format: "YYYY-MM-DD" or "DD/MM/YYYY"
      const dateStr = apiData.data_abertura;
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        foundedDate = `${year}-${month}-${day}`;
      } else {
        foundedDate = dateStr;
      }
    }

    // Parse registration_status_date
    let registrationStatusDate: string | null = null;
    if (apiData.situacao_cadastral?.data) {
      const dateStr = apiData.situacao_cadastral.data;
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        registrationStatusDate = `${year}-${month}-${day}`;
      } else {
        registrationStatusDate = dateStr;
      }
    }

    // Map API response to organization fields
    const updateData: Record<string, unknown> = {
      trade_name: apiData.nome_fantasia || null,
      company_size: apiData.porte_empresa?.descricao || null,
      branch_type: apiData.matriz_filial || null,
      legal_nature_code: apiData.codigo_natureza_juridica || null,
      legal_nature: apiData.descricao_natureza_juridica || null,
      founded_date: foundedDate,
      share_capital: apiData.capital_social ? apiData.capital_social / 100 : null, // Convert centavos to reais
      registration_status: apiData.situacao_cadastral?.situacao_cadastral || null,
      registration_status_date: registrationStatusDate,
      last_enriched_at: new Date().toISOString(),
      enrichment_source: 'Casa dos Dados',
      updated_at: new Date().toISOString(),
    };

    // Update address if available
    if (apiData.endereco) {
      updateData.address_street = apiData.endereco.logradouro || null;
      updateData.address_number = apiData.endereco.numero || null;
      updateData.address_complement = apiData.endereco.complemento || null;
      updateData.address_neighborhood = apiData.endereco.bairro || null;
      updateData.address_city = apiData.endereco.municipio || null;
      updateData.address_state = apiData.endereco.uf || null;
      updateData.address_zipcode = apiData.endereco.cep?.replace(/\D/g, '') || null;
      
      if (apiData.endereco.ibge) {
        updateData.latitude = apiData.endereco.ibge.latitude || null;
        updateData.longitude = apiData.endereco.ibge.longitude || null;
      }
    }

    // Update phone and email if not already set and available
    if (apiData.telefones && apiData.telefones.length > 0) {
      // Will be conditionally applied only if current is empty
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('phone, email')
        .eq('id', organizationId)
        .single();
      
      if (!currentOrg?.phone && apiData.telefones[0]) {
        updateData.phone = apiData.telefones[0];
      }
      
      if (!currentOrg?.email && apiData.emails && apiData.emails.length > 0) {
        updateData.email = apiData.emails[0];
      }
    }

    // Update organization
    const { error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId);

    if (updateError) {
      console.error('[enrich-organization] Erro ao atualizar organização:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar organização: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync partners (quadro societário)
    if (apiData.quadro_societario && apiData.quadro_societario.length > 0) {
      // Delete existing partners
      await supabase
        .from('organization_partners')
        .delete()
        .eq('organization_id', organizationId);

      // Insert new partners
      const partners = apiData.quadro_societario.map((socio) => {
        // Parse entry date
        let entryDate: string | null = null;
        if (socio.data_entrada) {
          const dateStr = socio.data_entrada;
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            entryDate = `${year}-${month}-${day}`;
          } else {
            entryDate = dateStr;
          }
        }

        return {
          organization_id: organizationId,
          name: socio.nome || 'Sócio',
          document: socio.cpf_cnpj || null,
          qualification: socio.qualificacao || null,
          qualification_code: socio.codigo_qualificacao || null,
          entry_date: entryDate,
          country: socio.pais || null,
          legal_rep_name: socio.representante_legal?.nome || null,
          legal_rep_document: socio.representante_legal?.cpf || null,
          legal_rep_qualification: socio.representante_legal?.qualificacao || null,
        };
      });

      const { error: partnersError } = await supabase
        .from('organization_partners')
        .insert(partners);

      if (partnersError) {
        console.error('[enrich-organization] Erro ao inserir sócios:', partnersError);
        // Don't fail the entire request, just log
      } else {
        console.log(`[enrich-organization] ${partners.length} sócios sincronizados`);
      }
    }

    // Log to history
    await supabase.from('organization_history').insert({
      organization_id: organizationId,
      event_type: 'enrichment',
      description: 'Dados atualizados via Receita Federal (Casa dos Dados)',
      metadata: {
        source: 'Casa dos Dados',
        fields_updated: Object.keys(updateData).filter(k => updateData[k] !== null),
        partners_count: apiData.quadro_societario?.length || 0,
      },
      created_by: userId,
    });

    console.log(`[enrich-organization] Organização ${organizationId} enriquecida com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dados atualizados com sucesso',
        updated_fields: Object.keys(updateData).filter(k => updateData[k] !== null).length,
        partners_synced: apiData.quadro_societario?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enrich-organization] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
