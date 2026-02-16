import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar perfil do usuario autenticado
    const userId = claimsData.claims.sub;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", userId)
      .maybeSingle();

    const senderName = profile?.full_name || "Corretor";

    const { organizationId, recipientName, emailType, customInstructions, personId } = await req.json();

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organizationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Fetch CRM data
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, cnpj, address_city, address_state, insurance_branches, preferred_insurers, annual_premium_estimate, current_insurer, cnae, company_size, trade_name, broker_notes, website")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: deals } = await supabase
      .from("deals")
      .select("title, value, status, insurance_type, insurer")
      .eq("organization_id", organizationId)
      .limit(5);

    // Fetch person data if personId provided
    let personData: { name: string; job_title: string | null; email: string | null; phone: string | null } | null = null;
    if (personId) {
      const { data: person } = await supabase
        .from("people")
        .select("name, job_title, email, phone")
        .eq("id", personId)
        .single();
      personData = person;
    }

    // Step 2: Perplexity research
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      console.error("PERPLEXITY_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Serviço de pesquisa indisponível" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyName = org.trade_name || org.name;
    const cnpjInfo = org.cnpj ? ` CNPJ ${org.cnpj}` : "";
    const searchQuery = `${companyName}${cnpjInfo} Brasil: notícias recentes, produtos e serviços, tamanho da empresa, segmento de atuação, desafios do setor, expansão recente`;

    const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "Você é um pesquisador de empresas brasileiras. Responda em português com informações relevantes e atuais sobre a empresa pesquisada. Seja objetivo e conciso." },
          { role: "user", content: searchQuery },
        ],
        search_recency_filter: "month",
      }),
    });

    if (!perplexityRes.ok) {
      const errText = await perplexityRes.text();
      console.error("Perplexity error:", perplexityRes.status, errText);
      return new Response(JSON.stringify({ error: "Falha na pesquisa da empresa" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const perplexityData = await perplexityRes.json();
    const researchSummary = perplexityData.choices?.[0]?.message?.content || "";
    const citations = perplexityData.citations || [];

    // Step 3: Generate email with Gemini via Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Serviço de geração indisponível" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailTypeLabels: Record<string, string> = {
      proposal: "Proposta comercial",
      followup: "Follow-up",
      introduction: "Apresentação / primeiro contato",
      custom: "Personalizado",
    };

    const crmContext = `
DADOS DO CRM:
- Empresa: ${org.name}${org.trade_name ? ` (${org.trade_name})` : ""}
- CNPJ: ${org.cnpj || "N/A"}
- Cidade: ${org.address_city || "N/A"} / ${org.address_state || "N/A"}
- CNAE: ${org.cnae || "N/A"}
- Porte: ${org.company_size || "N/A"}
- Ramos de seguro: ${org.insurance_branches?.join(", ") || "N/A"}
- Seguradoras preferidas: ${org.preferred_insurers?.join(", ") || "N/A"}
- Seguradora atual: ${org.current_insurer || "N/A"}
- Prêmio estimado: ${org.annual_premium_estimate ? `R$ ${org.annual_premium_estimate.toLocaleString()}` : "N/A"}
- Website: ${org.website || "N/A"}
- Notas do corretor: ${org.broker_notes || "N/A"}
${deals && deals.length > 0 ? `\nNEGÓCIOS RECENTES:\n${deals.map((d) => `- ${d.title}: R$ ${d.value || 0} (${d.status}) - ${d.insurance_type || "N/A"} / ${d.insurer || "N/A"}`).join("\n")}` : ""}
${personData ? `\nDADOS DO CONTATO DESTINATÁRIO:\n- Nome: ${personData.name}\n- Cargo: ${personData.job_title || "N/A"}\n- Email: ${personData.email || "N/A"}\n- Telefone: ${personData.phone || "N/A"}` : ""}
`.trim();

    const geminiPrompt = `Você é ${senderName}, um corretor de seguros brasileiro experiente e profissional. Gere um email ${emailTypeLabels[emailType] || "personalizado"} para ${recipientName || "o responsável"} da empresa ${org.name}.

${crmContext}

DADOS DO CORRETOR:
- Nome: ${senderName}
- Telefone: ${profile?.phone || "N/A"}

PESQUISA WEB RECENTE SOBRE A EMPRESA:
${researchSummary}

${customInstructions ? `INSTRUÇÕES ADICIONAIS DO USUÁRIO:\n${customInstructions}\n` : ""}

REGRAS:
- Escreva em português brasileiro formal mas amigável
- Seu nome como corretor é: ${senderName}. Use este nome ao se apresentar e assinar.
- NÃO invente nomes de corretor ou empresa de corretagem
- NÃO inclua assinatura no final do email (ela será adicionada automaticamente pelo sistema)
- Use informações da pesquisa web para personalizar o email de forma natural (cite fatos específicos encontrados)
- Não invente informações que não estão nos dados fornecidos
- O email deve ser conciso e direto (máximo 3-4 parágrafos)
- Inclua uma chamada para ação clara no final
- NÃO inclua saudação "Prezado" genérica - use o nome do destinatário
- Retorne APENAS um JSON com os campos "subject" e "body" (body em HTML simples com <p>, <br>, <strong>)
- O assunto deve ser específico e relevante, não genérico`;

    const geminiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "user", content: geminiPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_email",
              description: "Generate a personalized email with subject and body",
              parameters: {
                type: "object",
                properties: {
                  subject: { type: "string", description: "Email subject line" },
                  body: { type: "string", description: "Email body in simple HTML" },
                },
                required: ["subject", "body"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_email" } },
      }),
    });

    if (!geminiRes.ok) {
      if (geminiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (geminiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await geminiRes.text();
      console.error("Gemini error:", geminiRes.status, errText);
      return new Response(JSON.stringify({ error: "Email generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const toolCall = geminiData.choices?.[0]?.message?.tool_calls?.[0];
    let subject = "";
    let body = "";

    if (toolCall?.function?.arguments) {
      try {
        const args = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        subject = args.subject || "";
        body = args.body || "";
      } catch {
        // Fallback: try to parse content as JSON
        const content = geminiData.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          subject = parsed.subject || "";
          body = parsed.body || "";
        }
      }
    }

    return new Response(
      JSON.stringify({
        research_summary: researchSummary,
        citations,
        subject,
        body,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("research-company error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
