import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    
    // Remove formatting from CNPJ
    const cleanCnpj = cnpj?.replace(/\D/g, '');
    
    if (!cleanCnpj || cleanCnpj.length !== 14) {
      console.log('Invalid CNPJ length:', cleanCnpj?.length);
      return new Response(
        JSON.stringify({ error: 'CNPJ deve ter 14 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching CNPJ data for:', cleanCnpj);
    
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    
    if (!response.ok) {
      console.log('BrasilAPI response not ok:', response.status);
      return new Response(
        JSON.stringify({ error: 'CNPJ não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('BrasilAPI data received for company:', data.razao_social);
    
    // Map the response to our expected format
    const mappedData = {
      name: data.razao_social || null,
      fantasia: data.nome_fantasia || null,
      cnae: data.cnae_fiscal?.toString() || null,
      phone: data.ddd_telefone_1 || null,
      email: data.email?.toLowerCase() || null,
      address_street: data.logradouro || null,
      address_number: data.numero || null,
      address_complement: data.complemento || null,
      address_neighborhood: data.bairro || null,
      address_city: data.municipio || null,
      address_state: data.uf || null,
      address_zipcode: data.cep?.toString()?.replace(/\D/g, '') || null,
    };

    return new Response(
      JSON.stringify(mappedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching CNPJ:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao consultar CNPJ' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
