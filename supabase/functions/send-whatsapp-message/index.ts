import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SendMessageRequest {
  conversationId: string;
  content: string;
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

    // Verificar usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    console.log('User authenticated:', userId);

    const { conversationId, content }: SendMessageRequest = await req.json();

    if (!conversationId || !content) {
      return new Response(JSON.stringify({ error: 'conversationId and content are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar conversa com timelines_conversation_id (chat_id)
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('id, timelines_conversation_id, person_id, channel_id, status')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('Conversation not found:', convError);
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!conversation.timelines_conversation_id) {
      return new Response(JSON.stringify({ error: 'No Timelines.ai chat_id for this conversation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enviar mensagem para Timelines.ai
    const timelinesToken = Deno.env.get('TIMELINES_API_TOKEN');
    if (!timelinesToken) {
      throw new Error('TIMELINES_API_TOKEN is not configured');
    }

    const chatId = conversation.timelines_conversation_id;
    const timelinesResponse = await fetch(
      `https://app.timelines.ai/integrations/api/chats/${chatId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${timelinesToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content }),
      }
    );

    if (!timelinesResponse.ok) {
      const errorText = await timelinesResponse.text();
      console.error('Timelines.ai API error:', timelinesResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to send message via Timelines.ai',
        details: errorText,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const timelinesData = await timelinesResponse.json();
    console.log('Timelines.ai response:', timelinesData);

    // Usar service role para inserir mensagem
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Salvar mensagem localmente
    const { data: message, error: msgError } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        timelines_message_id: timelinesData.message_uid || `sent-${Date.now()}`,
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: userId,
        content: content,
        message_type: 'text',
        status: 'sent',
        metadata: { timelines_response: timelinesData },
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error saving message locally:', msgError);
      // Não falhar - a mensagem foi enviada com sucesso
    }

    // Atualizar conversa
    const updateData: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
    };

    // Se era a primeira resposta, registrar
    if (!conversation.status || conversation.status === 'pending') {
      updateData.status = 'in_progress';
      updateData.first_response_at = new Date().toISOString();
      updateData.assigned_to = userId;
    }

    await supabaseAdmin
      .from('whatsapp_conversations')
      .update(updateData)
      .eq('id', conversationId);

    // Registrar na timeline da pessoa
    const messagePreview = content.length > 100 
      ? content.substring(0, 100) + '...' 
      : content;

    // Buscar nome do usuário
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    await supabaseAdmin.from('people_history').insert({
      person_id: conversation.person_id,
      event_type: 'whatsapp_sent',
      description: `WhatsApp: "${messagePreview}"`,
      created_by: userId,
      metadata: {
        message_id: message?.id,
        conversation_id: conversationId,
        sender_name: profile?.full_name,
      },
    });

    console.log('Message sent and recorded successfully');

    return new Response(JSON.stringify({ 
      status: 'success',
      message_id: message?.id,
      timelines_response: timelinesData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Send message error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
