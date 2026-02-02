import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AnalyzeRequest {
  conversationId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId }: AnalyzeRequest = await req.json();

    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar conversa e pessoa
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        person_id,
        status,
        people:person_id (name)
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar mensagens
    const { data: messages, error: msgsError } = await supabase
      .from('whatsapp_messages')
      .select('sender_type, content, message_type, created_at, metadata')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgsError) {
      throw msgsError;
    }

    if (!messages || messages.length < 2) {
      return new Response(JSON.stringify({ error: 'Not enough messages to analyze' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Formatar transcript
    const peopleData = conversation.people as unknown as { name: string } | null;
    const personName = peopleData?.name || 'Cliente';
    const transcript = messages.map(m => {
      const sender = m.sender_type === 'contact' ? personName : 'Atendente';
      const content = m.content || `[${m.message_type}]`;
      return `${sender}: ${content}`;
    }).join('\n');

    console.log('Transcript length:', transcript.length, 'chars,', messages.length, 'messages');

    // Chamar Lovable AI com tool calling
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Você é um analista de qualidade de atendimento ao cliente. Analise a conversa de WhatsApp entre um atendente e um cliente e avalie a qualidade do atendimento.

Considere:
- Tempo de resposta e agilidade
- Clareza e objetividade nas respostas
- Tom cordial e profissional
- Resolução efetiva do problema/dúvida do cliente
- Proatividade e oferecimento de alternativas

Use a função analyze_conversation para retornar sua análise estruturada.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise esta conversa:\n\n${transcript}` },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_conversation',
              description: 'Retorna a análise estruturada da conversa',
              parameters: {
                type: 'object',
                properties: {
                  overall_score: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 10,
                    description: 'Score geral do atendimento (0-10)',
                  },
                  response_quality: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 10,
                    description: 'Qualidade das respostas (0-10)',
                  },
                  tone_score: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 10,
                    description: 'Tom e cordialidade (0-10)',
                  },
                  resolution_effectiveness: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 10,
                    description: 'Eficácia na resolução (0-10)',
                  },
                  professionalism: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 10,
                    description: 'Profissionalismo (0-10)',
                  },
                  sentiment: {
                    type: 'string',
                    enum: ['positive', 'neutral', 'negative'],
                    description: 'Sentimento geral do cliente',
                  },
                  summary: {
                    type: 'string',
                    description: 'Resumo da conversa em 2-3 frases',
                  },
                  strengths: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Pontos fortes do atendimento (lista)',
                  },
                  improvements: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Pontos a melhorar (lista)',
                  },
                },
                required: [
                  'overall_score',
                  'response_quality',
                  'tone_score',
                  'resolution_effectiveness',
                  'professionalism',
                  'sentiment',
                  'summary',
                  'strengths',
                  'improvements',
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_conversation' } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    // Extrair resultado do tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'analyze_conversation') {
      throw new Error('Invalid AI response format');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('Parsed analysis:', analysis);

    // Usar service role para salvar análise
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert análise
    const { data: savedAnalysis, error: saveError } = await supabaseAdmin
      .from('whatsapp_conversation_analysis')
      .upsert({
        conversation_id: conversationId,
        overall_score: analysis.overall_score,
        response_quality: analysis.response_quality,
        tone_score: analysis.tone_score,
        resolution_effectiveness: analysis.resolution_effectiveness,
        professionalism: analysis.professionalism,
        sentiment: analysis.sentiment,
        summary: analysis.summary,
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
        message_count: messages.length,
        analyzed_at: new Date().toISOString(),
      }, {
        onConflict: 'conversation_id',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      throw saveError;
    }

    console.log('Analysis saved:', savedAnalysis.id);

    return new Response(JSON.stringify({ 
      status: 'success',
      analysis: savedAnalysis,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analyze error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
