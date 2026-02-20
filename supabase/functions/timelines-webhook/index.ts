import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-webhook-secret',
};

// Attachment format v1 (singular) from Timelines.ai
interface AttachmentV1 {
  temporary_download_url: string;
  filename: string;
  size: number;
  mimetype: string;
}

// Attachment format v2 (array) for backwards compatibility
interface AttachmentV2 {
  url?: string;
  temporary_download_url?: string;
  mime_type?: string;
  mimetype?: string;
  type?: string;
  filename?: string;
}

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
    // v1 format (singular)
    attachment?: AttachmentV1;
    // v2 format (array) - backwards compatibility
    attachments?: AttachmentV2[];
  };
}

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed mime types
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/mp4',
  'video/mp4', 'video/3gpp', 'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

// Validate webhook secret - NOW MANDATORY
function validateWebhookSecret(req: Request): boolean {
  const webhookSecret = Deno.env.get('TIMELINES_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    console.error('TIMELINES_WEBHOOK_SECRET not configured - rejecting request');
    return false;
  }
  
  const providedSecret = req.headers.get('x-webhook-secret') || 
                         req.headers.get('X-Webhook-Secret') ||
                         new URL(req.url).searchParams.get('secret');
  
  if (!providedSecret) {
    console.error('Webhook secret missing from request');
    return false;
  }
  
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

// Normalize phone number
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Normalize phone for search
function normalizePhoneForSearch(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    return digits.substring(2);
  }
  return digits;
}

// Format phone for display
function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

// Format phone for storage
function formatPhoneForStorage(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `+55${digits}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits}`;
  }
  return phone;
}

// Sanitize text content - strip all HTML tags and limit length
function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  // First decode any HTML entities to catch encoded attacks
  let clean = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  // Strip all HTML tags (aggressive approach - no HTML allowed in plain text messages)
  clean = clean.replace(/<[^>]*>/g, '');
  // Remove any null bytes
  clean = clean.replace(/\0/g, '');
  // Trim and limit length
  return clean.trim().slice(0, 10000);
}

// Get media type from mimetype
function getMediaTypeFromMimetype(mimetype: string | undefined): string {
  if (!mimetype) return 'document';
  
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  
  return 'document';
}

// Download and store media file - now returns file path instead of public URL
async function downloadAndStoreMedia(
  supabase: SupabaseClient,
  conversationId: string,
  messageId: string,
  tempUrl: string,
  filename: string,
  mimetype: string
): Promise<string | null> {
  try {
    console.log('Downloading media from:', tempUrl.substring(0, 50) + '...');
    
    // Validate mimetype
    if (!ALLOWED_MIME_TYPES.some(allowed => mimetype.toLowerCase().startsWith(allowed.split('/')[0]))) {
      console.warn('Mime type not in allowed list:', mimetype);
    }
    
    // Download file from temporary URL
    const response = await fetch(tempUrl, {
      headers: {
        'User-Agent': 'Lovable-CRM-Webhook/1.0',
      },
    });
    
    if (!response.ok) {
      console.error('Failed to download media:', response.status, response.statusText);
      return null;
    }
    
    // Check content length
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      console.error('File too large:', contentLength);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Double-check size after download
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      console.error('Downloaded file too large:', arrayBuffer.byteLength);
      return null;
    }
    
    // Generate unique path
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const filePath = `${conversationId}/${messageId}/${sanitizedFilename}`;
    
    console.log('Uploading to storage:', filePath);
    
    // Upload to bucket
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, arrayBuffer, {
        contentType: mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload media:', uploadError);
      return null;
    }

    // Return file path (not public URL) - bucket is now private
    console.log('Media stored successfully at path:', filePath);
    return filePath;
  } catch (error) {
    console.error('Error processing media:', error);
    return null;
  }
}

// Extract attachment from payload (supports v1 and v2 formats)
function extractAttachment(message: TimelinesPayload['message']): {
  tempUrl: string | null;
  filename: string;
  mimetype: string;
  size: number;
} {
  if (!message) {
    return { tempUrl: null, filename: '', mimetype: '', size: 0 };
  }
  
  // Try v1 format first (singular attachment)
  if (message.attachment) {
    const att = message.attachment;
    return {
      tempUrl: att.temporary_download_url || null,
      filename: att.filename || 'arquivo',
      mimetype: att.mimetype || 'application/octet-stream',
      size: att.size || 0,
    };
  }
  
  // Try v2 format (array)
  if (message.attachments && message.attachments.length > 0) {
    const att = message.attachments[0];
    return {
      tempUrl: att.temporary_download_url || att.url || null,
      filename: att.filename || 'arquivo',
      mimetype: att.mimetype || att.mime_type || 'application/octet-stream',
      size: 0,
    };
  }
  
  return { tempUrl: null, filename: '', mimetype: '', size: 0 };
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
    // Check payload size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1_000_000) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Validate event type
    if (!['message:received:new', 'chat:incoming:new'].includes(payload.event_type)) {
      console.log('Ignoring event type:', payload.event_type);
      return new Response(JSON.stringify({ status: 'ignored', event_type: payload.event_type }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Upsert WhatsApp Channel
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
    
    // Get channel owner for attribution
    const channelOwnerId = channel.owner_id;

    // 2. Find or create person by phone
    const searchPhone = normalizePhoneForSearch(payload.chat.phone);
    console.log('Searching for contact with phone:', searchPhone);
    
    const rawName = sanitizeText(payload.chat.full_name || payload.message?.sender.full_name);
    const isValidName = rawName && !rawName.match(/^\+?\d[\d\s\-()]+$/);
    const contactName = isValidName 
      ? rawName.slice(0, 255) 
      : formatPhoneForDisplay(payload.chat.phone);
    
    console.log('Contact name resolved:', contactName);

    let { data: existingPerson } = await supabase
      .from('people')
      .select('id, name, whatsapp, phone')
      .or(`whatsapp.ilike.%${searchPhone}%,phone.ilike.%${searchPhone}%`)
      .limit(1)
      .maybeSingle();
    
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
      const formattedPhone = formatPhoneForStorage(payload.chat.phone);
      console.log('Creating new person with name:', contactName, 'whatsapp:', formattedPhone);
      
      const { data: newPerson, error: personError } = await supabase
        .from('people')
        .insert({
          name: contactName,
          whatsapp: formattedPhone.slice(0, 50),
          lead_source: 'WhatsApp',
          owner_id: channelOwnerId || null,
        })
        .select()
        .single();

      if (personError) {
        console.error('Error creating person:', personError);
        throw personError;
      }

      personId = newPerson.id;
      console.log('Created new person:', personId, 'owner:', channelOwnerId || 'none');

      await supabase.from('people_history').insert({
        person_id: personId,
        event_type: 'created',
        description: channelOwnerId 
          ? `Contato criado automaticamente via WhatsApp (Canal: ${channelName})`
          : 'Contato criado automaticamente via WhatsApp',
        created_by: channelOwnerId || null,
      });
    }

    // 3. Upsert Conversation
    const chatId = String(payload.chat.chat_id);
    
    let { data: existingConversation } = await supabase
      .from('whatsapp_conversations')
      .select('id, status')
      .eq('timelines_conversation_id', chatId)
      .maybeSingle();

    let conversationId: string;
    let isNewConversation = false;

    if (existingConversation) {
      conversationId = existingConversation.id;
      
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
        await supabase
          .from('whatsapp_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    } else {
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

      await supabase.from('people_history').insert({
        person_id: personId,
        event_type: 'whatsapp_conversation_started',
        description: 'Nova conversa WhatsApp iniciada',
        metadata: { conversation_id: conversationId },
      });
    }

    // 4. Insert Message (if present)
    if (payload.message) {
      const messageUid = payload.message.message_uid;

      // Check if message already exists
      const { data: existingMessage } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('timelines_message_id', messageUid)
        .maybeSingle();

      if (!existingMessage) {
        const messageText = sanitizeText(payload.message.text);
        
        // Extract attachment (supports v1 and v2 formats)
        const { tempUrl, filename, mimetype } = extractAttachment(payload.message);
        
        // Determine message type
        let messageType = 'text';
        let storedMediaPath: string | null = null;
        
        if (tempUrl) {
          messageType = getMediaTypeFromMimetype(mimetype);
          console.log('Message has attachment:', messageType, filename);
          
          // Download and store media - returns file path (not public URL)
          storedMediaPath = await downloadAndStoreMedia(
            supabase,
            conversationId,
            messageUid,
            tempUrl,
            filename,
            mimetype
          );
          
          if (!storedMediaPath) {
            console.warn('Failed to store media, message will be saved without media path');
          }
        }

        const { data: newMessage, error: msgError } = await supabase
          .from('whatsapp_messages')
          .insert({
            timelines_message_id: messageUid,
            conversation_id: conversationId,
            sender_type: payload.message.direction === 'received' ? 'contact' : 'agent',
            content: messageText.slice(0, 10000),
            message_type: messageType,
            status: 'delivered',
            media_url: storedMediaPath,
            media_mime_type: mimetype || null,
            metadata: {
              timestamp: payload.message.timestamp,
              sender_phone: payload.message.sender.phone?.slice(0, 50),
              sender_name: sanitizeText(payload.message.sender.full_name)?.slice(0, 255),
              original_filename: filename || null,
            },
          })
          .select()
          .single();

        if (msgError) {
          console.error('Error inserting message:', msgError);
          throw msgError;
        }

        console.log('Inserted message:', newMessage.id, 'type:', messageType, 'has_media:', !!storedMediaPath);

        // 5. Record in Person Timeline
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
            has_media: !!storedMediaPath,
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
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
