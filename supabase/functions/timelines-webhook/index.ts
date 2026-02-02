import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

// Normaliza número de telefone para comparação
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
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

  try {
    const payload: TimelinesPayload = await req.json();
    console.log('Received webhook:', JSON.stringify(payload, null, 2));

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
    const { data: channel, error: channelError } = await supabase
      .from('whatsapp_channels')
      .upsert({
        timelines_channel_id: channelPhone,
        name: payload.whatsapp_account.full_name || 'WhatsApp Business',
        phone_number: payload.whatsapp_account.phone,
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

    // 2. Buscar ou criar pessoa pelo telefone
    const contactPhone = normalizePhone(payload.chat.phone);
    const contactName = payload.chat.full_name || payload.message?.sender.full_name || 'Contato WhatsApp';

    // Buscar pessoa existente pelo whatsapp ou phone
    let { data: existingPerson } = await supabase
      .from('people')
      .select('id, name, whatsapp, phone')
      .or(`whatsapp.ilike.%${contactPhone}%,phone.ilike.%${contactPhone}%`)
      .limit(1)
      .maybeSingle();

    let personId: string;

    if (existingPerson) {
      personId = existingPerson.id;
      console.log('Found existing person:', personId);
    } else {
      // Criar nova pessoa
      const { data: newPerson, error: personError } = await supabase
        .from('people')
        .insert({
          name: contactName,
          whatsapp: payload.chat.phone,
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

        const { data: newMessage, error: msgError } = await supabase
          .from('whatsapp_messages')
          .insert({
            timelines_message_id: messageUid,
            conversation_id: conversationId,
            sender_type: payload.message.direction === 'received' ? 'contact' : 'agent',
            content: payload.message.text,
            message_type: messageType,
            status: 'delivered',
            media_url: mediaAttachment?.url,
            media_mime_type: mediaAttachment?.mime_type,
            metadata: {
              timestamp: payload.message.timestamp,
              sender_phone: payload.message.sender.phone,
              sender_name: payload.message.sender.full_name,
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

        const messagePreview = payload.message.text?.length > 100 
          ? payload.message.text.substring(0, 100) + '...' 
          : payload.message.text || `[${messageType}]`;

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
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
