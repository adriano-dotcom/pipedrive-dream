import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-webhook-secret',
};

interface TimelinesPayload {
  event_type: string;
  chat: {
    chat_id: number;
    phone: string;
    full_name: string;
    is_group?: boolean;
  };
  whatsapp_account: {
    phone: string;
    full_name: string;
  };
  message?: {
    text: string;
    direction: 'received' | 'sent';
    timestamp: string;
    message_uid: string;
    sender: {
      phone: string;
      full_name: string;
    };
    attachments?: Array<{
      url: string;
      mime_type: string;
      type: string;
    }>;
  };
}

// Validate webhook secret
function validateWebhookSecret(req: Request): boolean {
  const webhookSecret = Deno.env.get('TIMELINES_WEBHOOK_SECRET');
  
  // If no secret is configured, log a warning but allow for backward compatibility
  // IMPORTANT: Configure TIMELINES_WEBHOOK_SECRET in production for security
  if (!webhookSecret) {
    console.warn('TIMELINES_WEBHOOK_SECRET not configured - webhook authentication disabled');
    return true;
  }
  
  const providedSecret = req.headers.get('x-webhook-secret') || 
                         req.headers.get('X-Webhook-Secret') ||
                         new URL(req.url).searchParams.get('secret');
  
  if (!providedSecret) {
    console.error('Webhook secret missing from request');
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  if (providedSecret.length !== webhookSecret.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < webhookSecret.length; i++) {
    result |= webhookSecret.charCodeAt(i) ^ providedSecret.charCodeAt(i);
  }
  
  return result === 0;
}

// Validate payload structure
function validatePayload(payload: unknown): payload is TimelinesPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  
  const p = payload as Record<string, unknown>;
  
  // Check required fields
  if (typeof p.event_type !== 'string') {
    console.error('Invalid payload: missing event_type');
    return false;
  }
  
  if (!p.chat || typeof p.chat !== 'object') {
    console.error('Invalid payload: missing chat object');
    return false;
  }
  
  const chat = p.chat as Record<string, unknown>;
  if (typeof chat.chat_id !== 'number' || typeof chat.phone !== 'string') {
    console.error('Invalid payload: invalid chat structure');
    return false;
  }
  
  if (!p.whatsapp_account || typeof p.whatsapp_account !== 'object') {
    console.error('Invalid payload: missing whatsapp_account object');
    return false;
  }
  
  const account = p.whatsapp_account as Record<string, unknown>;
  if (typeof account.phone !== 'string') {
    console.error('Invalid payload: invalid whatsapp_account structure');
    return false;
  }
  
  // Validate message if present
  if (p.message) {
    if (typeof p.message !== 'object') {
      console.error('Invalid payload: message must be an object');
      return false;
    }
    
    const msg = p.message as Record<string, unknown>;
    if (typeof msg.direction !== 'string' || !['received', 'sent'].includes(msg.direction)) {
      console.error('Invalid payload: invalid message direction');
      return false;
    }
    
    if (typeof msg.message_uid !== 'string') {
      console.error('Invalid payload: missing message_uid');
      return false;
    }
  }
  
  return true;
}

// Normaliza número de telefone removendo caracteres especiais
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Normaliza número para busca (remove código do país se presente)
function normalizePhoneForSearch(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  // Se começar com 55 e tiver mais de 11 dígitos, remove o 55
  if (digits.startsWith('55') && digits.length > 11) {
    return digits.substring(2);
  }
  return digits;
}

// Formata telefone para exibição como nome
function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Formato brasileiro: (XX) XXXXX-XXXX
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  // Formato com código do país: (XX) XXXXX-XXXX
  if (digits.length === 13 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  // Retorna o número original se não conseguir formatar
  return phone;
}

// Formata telefone para salvar no padrão consistente
function formatPhoneForStorage(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Garantir que tenha código do país
  if (digits.length === 11) {
    return `+55${digits}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits}`;
  }
  return phone;
}

// Sanitize text content to prevent injection
function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  // Remove any potential script tags and HTML
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 10000); // Limit length
}

// Determina o tipo de mensagem baseado nos attachments
function getMessageType(attachments?: Array<{ type: string }>): string {
  if (!attachments || attachments.length === 0) return 'text';
  const type = attachments[0].type?.toLowerCase();
  if (['image', 'audio', 'video', 'document', 'sticker', 'location', 'contact'].includes(type)) {
    return type;
  }
  return 'document';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error('Invalid method:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validate webhook secret
    if (!validateWebhookSecret(req)) {
      console.error('Webhook authentication failed');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate payload
    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch {
      console.error('Invalid JSON payload');
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validatePayload(rawPayload)) {
      return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = rawPayload;
    console.log('Received valid webhook:', payload.event_type);

    // Validar evento
    if (!['message:received:new', 'chat:incoming:new'].includes(payload.event_type)) {
      console.log('Ignoring event type:', payload.event_type);
      return new Response(JSON.stringify({ status: 'ignored', event_type: payload.event_type }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Upsert Canal WhatsApp
    const channelPhone = normalizePhone(payload.whatsapp_account.phone);
    const channelName = sanitizeText(payload.whatsapp_account.full_name) || 'WhatsApp Business';
    
    const { data: channel, error: channelError } = await supabase
      .from('whatsapp_channels')
      .upsert({
        timelines_channel_id: channelPhone,
        name: channelName.slice(0, 255),
        phone_number: payload.whatsapp_account.phone.slice(0, 50),
        is_active: true,
      }, {
        onConflict: 'timelines_channel_id',
      })
      .select()
      .single();

    if (channelError) {
      console.error('Error upserting channel:', channelError);
      throw channelError;
    }

    console.log('Channel upserted:', channel.id);

    // 2. Buscar ou criar pessoa pelo telefone - busca robusta
    const searchPhone = normalizePhoneForSearch(payload.chat.phone);
    console.log('Searching for contact with phone:', searchPhone);
    
    // Determinar nome do contato (nunca usar "Contato WhatsApp" genérico)
    const rawName = sanitizeText(payload.chat.full_name || payload.message?.sender.full_name);
    const isValidName = rawName && !rawName.match(/^\+?\d[\d\s\-()]+$/); // Não é apenas número
    const contactName = isValidName 
      ? rawName.slice(0, 255) 
      : formatPhoneForDisplay(payload.chat.phone);
    
    console.log('Contact name resolved:', contactName);

    // Buscar pessoa existente pelo whatsapp ou phone - múltiplas variações
    let { data: existingPerson } = await supabase
      .from('people')
      .select('id, name, whatsapp, phone')
      .or(`whatsapp.ilike.%${searchPhone}%,phone.ilike.%${searchPhone}%`)
      .limit(1)
      .maybeSingle();
    
    // Se não encontrou, tentar com código do país
    if (!existingPerson) {
      console.log('Person not found, trying with country code...');
      const { data: foundWithCountry } = await supabase
        .from('people')
        .select('id, name, whatsapp, phone')
        .or(`whatsapp.ilike.%55${searchPhone}%,phone.ilike.%55${searchPhone}%`)
        .limit(1)
        .maybeSingle();
      
      existingPerson = foundWithCountry;
    }

    let personId: string;

    if (existingPerson) {
      personId = existingPerson.id;
      console.log('Found existing person:', personId, existingPerson.name);
    } else {
      // Criar nova pessoa com número formatado
      const formattedPhone = formatPhoneForStorage(payload.chat.phone);
      console.log('Creating new person with name:', contactName, 'whatsapp:', formattedPhone);
      
      const { data: newPerson, error: personError } = await supabase
        .from('people')
        .insert({
          name: contactName,
          whatsapp: formattedPhone.slice(0, 50),
          lead_source: 'WhatsApp',
        })
        .select()
        .single();

      if (personError) {
        console.error('Error creating person:', personError);
        throw personError;
      }

      personId = newPerson.id;
      console.log('Created new person:', personId);

      // Registrar criação na timeline
      await supabase.from('people_history').insert({
        person_id: personId,
        event_type: 'created',
        description: 'Contato criado automaticamente via WhatsApp',
      });
    }

    // 3. Upsert Conversa
    const chatId = String(payload.chat.chat_id);
    
    // Verificar se conversa existe
    let { data: existingConversation } = await supabase
      .from('whatsapp_conversations')
      .select('id, status')
      .eq('timelines_conversation_id', chatId)
      .maybeSingle();

    let conversationId: string;
    let isNewConversation = false;

    if (existingConversation) {
      conversationId = existingConversation.id;
      
      // Reabrir conversa se estava resolvida/arquivada
      if (['resolved', 'archived'].includes(existingConversation.status)) {
        await supabase
          .from('whatsapp_conversations')
          .update({ 
            status: 'pending',
            last_message_at: new Date().toISOString(),
          })
          .eq('id', conversationId);
        
        console.log('Reopened conversation:', conversationId);
      } else {
        // Atualizar last_message_at
        await supabase
          .from('whatsapp_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    } else {
      // Criar nova conversa
      const { data: newConversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          timelines_conversation_id: chatId,
          channel_id: channel.id,
          person_id: personId,
          status: 'pending',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      conversationId = newConversation.id;
      isNewConversation = true;
      console.log('Created new conversation:', conversationId);

      // Registrar nova conversa na timeline
      await supabase.from('people_history').insert({
        person_id: personId,
        event_type: 'whatsapp_conversation_started',
        description: 'Nova conversa WhatsApp iniciada',
        metadata: { conversation_id: conversationId },
      });
    }

    // 4. Inserir Mensagem (se houver)
    if (payload.message) {
      const messageUid = payload.message.message_uid;

      // Verificar se mensagem já existe (evitar duplicatas)
      const { data: existingMessage } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('timelines_message_id', messageUid)
        .maybeSingle();

      if (!existingMessage) {
        const messageType = getMessageType(payload.message.attachments);
        const mediaAttachment = payload.message.attachments?.[0];
        const messageText = sanitizeText(payload.message.text);

        const { data: newMessage, error: msgError } = await supabase
          .from('whatsapp_messages')
          .insert({
            timelines_message_id: messageUid,
            conversation_id: conversationId,
            sender_type: payload.message.direction === 'received' ? 'contact' : 'agent',
            content: messageText.slice(0, 10000),
            message_type: messageType,
            status: 'delivered',
            media_url: mediaAttachment?.url?.slice(0, 2000),
            media_mime_type: mediaAttachment?.mime_type?.slice(0, 100),
            metadata: {
              timestamp: payload.message.timestamp,
              sender_phone: payload.message.sender.phone?.slice(0, 50),
              sender_name: sanitizeText(payload.message.sender.full_name)?.slice(0, 255),
            },
          })
          .select()
          .single();

        if (msgError) {
          console.error('Error inserting message:', msgError);
          throw msgError;
        }

        console.log('Inserted message:', newMessage.id);

        // 5. Registrar na Timeline da Pessoa
        const eventType = payload.message.direction === 'received' 
          ? 'whatsapp_received' 
          : 'whatsapp_sent';

        const messagePreview = messageText.length > 100 
          ? messageText.substring(0, 100) + '...' 
          : messageText || `[${messageType}]`;

        await supabase.from('people_history').insert({
          person_id: personId,
          event_type: eventType,
          description: `WhatsApp: "${messagePreview}"`,
          metadata: {
            message_id: newMessage.id,
            conversation_id: conversationId,
            message_type: messageType,
            direction: payload.message.direction,
          },
        });

        console.log('Recorded in timeline:', eventType);
      } else {
        console.log('Message already exists, skipping:', messageUid);
      }
    }

    return new Response(JSON.stringify({ 
      status: 'success',
      channel_id: channel.id,
      person_id: personId,
      conversation_id: conversationId,
      is_new_conversation: isNewConversation,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    // Return generic error to avoid information leakage
    return new Response(JSON.stringify({ 
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
