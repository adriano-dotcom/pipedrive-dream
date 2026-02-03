
# Implementacao de Armazenamento de Arquivos WhatsApp

## Problema Identificado

Ao analisar o banco de dados, identifiquei que **todos os documentos recebidos via WhatsApp estao sendo salvos com `media_url = null`**:

```sql
SELECT message_type, media_url, media_mime_type FROM whatsapp_messages WHERE message_type = 'document';

-- Resultado: Todos os 10+ documentos tem media_url = null
```

A causa raiz e que o **webhook esta mapeando os campos incorretamente** em relacao ao formato enviado pelo Timelines.ai.

---

## Causa Raiz Tecnica

### Formato Esperado pelo Codigo Atual

```typescript
// supabase/functions/timelines-webhook/index.ts (linhas 27-35)
attachments?: Array<{
  url: string,          // Campo esperado
  mime_type: string,    // Campo esperado
  type: string
}>
```

### Formato Real do Timelines.ai (Documentacao v1)

```json
{
  "message": {
    "text": "lorem ipsum",
    "attachment": {                          // Singular, nao array
      "temporary_download_url": "...",       // Nome diferente
      "filename": "documento.pdf",
      "size": 12345,
      "mimetype": "application/pdf"          // Nome diferente
    }
  }
}
```

### Problema Adicional

As URLs do Timelines.ai sao **temporarias e expiram em 15 minutos**. Mesmo que o mapeamento seja corrigido, os arquivos precisam ser baixados e persistidos no storage do projeto.

---

## Plano de Implementacao

### Fase 1: Criar Bucket de Storage para Midia WhatsApp

Criar um bucket `whatsapp-media` com as policies apropriadas:

```sql
-- Criar bucket para midia do WhatsApp
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Usuarios autenticados podem visualizar arquivos
CREATE POLICY "Auth users can read whatsapp media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media');

-- Policy: Service role pode fazer upload (webhook)
CREATE POLICY "Service role can upload whatsapp media"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'whatsapp-media');
```

### Fase 2: Corrigir Interface do Webhook

Atualizar a interface `TimelinesPayload` para suportar **ambos os formatos** (v1 singular e possivel v2 array):

```typescript
// supabase/functions/timelines-webhook/index.ts

interface TimelinesPayload {
  // ... campos existentes ...
  message?: {
    text: string;
    direction: 'received' | 'sent';
    timestamp: string;
    message_uid: string;
    sender: { phone: string; full_name: string };
    // Formato v1 (singular)
    attachment?: {
      temporary_download_url: string;
      filename: string;
      size: number;
      mimetype: string;
    };
    // Formato v2 (array) - manter compatibilidade
    attachments?: Array<{
      url?: string;
      temporary_download_url?: string;
      mime_type?: string;
      mimetype?: string;
      type?: string;
      filename?: string;
    }>;
  };
}
```

### Fase 3: Implementar Download e Upload de Arquivos

Adicionar funcao para baixar o arquivo do Timelines.ai e fazer upload para o Storage:

```typescript
async function downloadAndStoreMedia(
  supabase: SupabaseClient,
  conversationId: string,
  messageId: string,
  tempUrl: string,
  filename: string,
  mimetype: string
): Promise<string | null> {
  try {
    // Baixar arquivo da URL temporaria
    const response = await fetch(tempUrl);
    if (!response.ok) {
      console.error('Failed to download media:', response.status);
      return null;
    }

    const blob = await response.blob();
    
    // Gerar path unico: whatsapp-media/{conversation_id}/{message_id}/{filename}
    const filePath = `${conversationId}/${messageId}/${filename}`;

    // Upload para o bucket
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, blob, {
        contentType: mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload media:', uploadError);
      return null;
    }

    // Retornar URL publica
    const { data } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error processing media:', error);
    return null;
  }
}
```

### Fase 4: Atualizar Logica de Insercao de Mensagem

Modificar o trecho que insere mensagens para:
1. Detectar attachment (v1 singular ou v2 array)
2. Baixar e persistir o arquivo
3. Salvar a URL permanente na mensagem

```typescript
// Na secao de insercao de mensagem (linha ~424)
if (!existingMessage) {
  // Extrair attachment - suportar v1 (singular) e v2 (array)
  const attachment = payload.message.attachment || payload.message.attachments?.[0];
  
  // Normalizar campos
  const tempUrl = attachment?.temporary_download_url || attachment?.url;
  const mimetype = attachment?.mimetype || attachment?.mime_type;
  const filename = attachment?.filename || 'arquivo';
  const mediaType = attachment?.type || getMediaTypeFromMimetype(mimetype);

  let permanentMediaUrl: string | null = null;

  // Se tiver URL temporaria, baixar e persistir
  if (tempUrl) {
    permanentMediaUrl = await downloadAndStoreMedia(
      supabase,
      conversationId,
      messageUid,
      tempUrl,
      filename,
      mimetype
    );
  }

  // Inserir mensagem com URL permanente
  const { data: newMessage, error: msgError } = await supabase
    .from('whatsapp_messages')
    .insert({
      timelines_message_id: messageUid,
      conversation_id: conversationId,
      sender_type: payload.message.direction === 'received' ? 'contact' : 'agent',
      content: messageText.slice(0, 10000),
      message_type: mediaType,
      status: 'delivered',
      media_url: permanentMediaUrl,  // URL permanente do storage
      media_mime_type: mimetype,
      metadata: {
        timestamp: payload.message.timestamp,
        sender_phone: payload.message.sender.phone,
        sender_name: payload.message.sender.full_name,
        original_filename: filename,  // Preservar nome original
      },
    })
    .select()
    .single();
}
```

### Fase 5: Funcao Auxiliar para Tipo de Midia

```typescript
function getMediaTypeFromMimetype(mimetype: string | undefined): string {
  if (!mimetype) return 'document';
  
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'document';
  
  return 'document';
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| Nova migracao SQL | Criar bucket `whatsapp-media` com policies |
| `supabase/functions/timelines-webhook/index.ts` | Corrigir interface, adicionar funcao de download/upload, atualizar logica de insercao |
| `src/components/whatsapp/MessageBubble.tsx` | Nenhuma mudanca necessaria (ja suporta media_url) |

---

## Consideracoes de Seguranca

1. **Bucket publico**: O bucket `whatsapp-media` sera publico para que os usuarios possam visualizar os arquivos sem autenticacao adicional. Isso e necessario porque as URLs sao exibidas diretamente no chat.

2. **Validacao de mimetype**: Validar tipos de arquivo permitidos para evitar upload de arquivos maliciosos.

3. **Limite de tamanho**: Implementar limite de 10MB por arquivo para evitar abuso.

---

## Resultado Esperado

Apos a implementacao:

1. Arquivos recebidos via WhatsApp serao baixados automaticamente
2. Arquivos serao armazenados permanentemente no Lovable Cloud Storage
3. URLs permanentes serao salvas na tabela `whatsapp_messages`
4. O componente `MessageBubble` exibira os arquivos corretamente (imagens, documentos, audio, video)
5. Arquivos antigos com `media_url = null` continuarao sem midia (nao ha como recuperar as URLs temporarias que ja expiraram)
