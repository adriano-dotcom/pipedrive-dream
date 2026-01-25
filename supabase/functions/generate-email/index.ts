import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateEmailRequest {
  entityType: "deal" | "person" | "organization";
  entityName: string;
  recipientName: string;
  context?: string;
  emailType?: "proposal" | "followup" | "introduction" | "custom";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub;

    // Get user's profile for signature
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", userId)
      .maybeSingle();

    // Get user's signature if exists
    const { data: signature } = await supabase
      .from("user_signatures")
      .select("signature_html")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    const { entityType, entityName, recipientName, context, emailType = "proposal" }: GenerateEmailRequest = await req.json();

    if (!entityName || !recipientName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: entityName, recipientName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderName = profile?.full_name || "Corretor";

    // Build the prompt based on email type
    let emailTypeInstructions = "";
    switch (emailType) {
      case "proposal":
        emailTypeInstructions = "Escreva um email profissional apresentando uma proposta de seguro. Seja persuasivo mas não agressivo.";
        break;
      case "followup":
        emailTypeInstructions = "Escreva um email de follow-up amigável, verificando o interesse e oferecendo ajuda adicional.";
        break;
      case "introduction":
        emailTypeInstructions = "Escreva um email de apresentação profissional, apresentando a empresa e serviços de corretagem de seguros.";
        break;
      case "custom":
        emailTypeInstructions = "Escreva um email profissional baseado no contexto fornecido.";
        break;
    }

    const systemPrompt = `Você é um assistente especializado em escrever emails profissionais para corretores de seguros brasileiros.

Regras:
- Escreva em português brasileiro formal mas amigável
- Seja conciso e direto ao ponto
- Use parágrafos curtos
- Não use emojis
- O email deve ser profissional e transmitir confiança
- Termine com uma call-to-action clara
- NÃO inclua assinatura no corpo do email (ela será adicionada automaticamente)

${emailTypeInstructions}`;

    const userPrompt = `Escreva um email para ${recipientName}${entityType === "organization" ? ` da empresa ${entityName}` : ""}.

Contexto adicional: ${context || "Nenhum contexto adicional fornecido."}

Nome do remetente: ${senderName}

Por favor, retorne o resultado em formato JSON com os campos:
- subject: o assunto do email (curto e objetivo)
- body: o corpo do email em HTML (use tags <p> para parágrafos, <strong> para negrito, <br> para quebras de linha)`;

    console.log("Generating email with Lovable AI...");

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI response:", content);

    // Parse the JSON response
    let emailContent: { subject: string; body: string };
    try {
      emailContent = JSON.parse(content);
    } catch {
      // If JSON parsing fails, try to extract from the content
      console.error("Failed to parse AI response as JSON, attempting extraction...");
      const subjectMatch = content.match(/subject["\s:]+([^"]+)/i);
      const bodyMatch = content.match(/body["\s:]+(.+)/is);
      
      emailContent = {
        subject: subjectMatch?.[1]?.trim() || "Proposta de Seguro",
        body: bodyMatch?.[1]?.trim().replace(/^["']|["']$/g, "") || content,
      };
    }

    // Append signature if exists
    if (signature?.signature_html) {
      emailContent.body += `<br><br>${signature.signature_html}`;
    }

    return new Response(
      JSON.stringify({
        subject: emailContent.subject,
        body: emailContent.body,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-email function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
