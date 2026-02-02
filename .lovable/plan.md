

# Plano: Integração Timelines.ai com Timeline do CRM

## Visão Geral

Integrar o Timelines.ai para receber e enviar mensagens de WhatsApp, exibindo as conversas diretamente na timeline dos contatos existentes (`people`). Quando uma mensagem chegar de um número não cadastrado, o sistema criará automaticamente uma nova pessoa.

## Decisões Arquiteturais

### Adaptação ao Sistema Existente

| Proposta Original | Adaptação |
|-------------------|-----------|
| Criar tabela `contacts` | Usar tabela existente `people` |
| Timeline separada | Integrar na `people_history` existente |
| Campo `whatsapp` novo | Já existe na tabela `people` |

### Novas Tabelas

Apenas as tabelas necessárias para WhatsApp:

```text
┌─────────────────────────────────────────────────────────────────┐
│                        ESTRUTURA DE DADOS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [channels]          [whatsapp_conversations]    [people]       │
│  - WhatsApp accounts  - chat_id Timelines.ai     - (existente)  │
│                       - person_id FK                            │
│                       - status                                  │
│                                                                 │
│  [whatsapp_messages]  [conversation_analysis]                   │
│  - message_uid        - scores IA                               │
│  - conversation_id FK - sentiment                               │
│  - content/media      - resumo                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Banco de Dados

### 1. ENUMs

```sql
CREATE TYPE whatsapp_conversation_status AS ENUM ('pending', 'in_progress', 'resolved', 'archived');
CREATE TYPE whatsapp_message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE whatsapp_message_type AS ENUM ('text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'sticker');
```

### 2. Tabela `whatsapp_channels`

Armazena as contas WhatsApp conectadas ao Timelines.ai.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | ID interno |
| timelines_channel_id | text UNIQUE | ID da conta no Timelines.ai |
| name | text | Nome da conta |
| phone_number | text | Número do WhatsApp |
| is_active | boolean | Se está ativo |
| metadata | jsonb | Dados adicionais |

### 3. Tabela `whatsapp_conversations`

Conversas vinculadas a pessoas do CRM.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | ID interno |
| timelines_conversation_id | text UNIQUE | chat_id do Timelines.ai |
| channel_id | uuid FK | Canal WhatsApp |
| person_id | uuid FK → people | Pessoa do CRM |
| status | enum | pending/in_progress/resolved/archived |
| assigned_to | uuid | Atendente responsável |
| priority | integer | Prioridade (0-5) |
| tags | text[] | Tags da conversa |
| last_message_at | timestamptz | Última mensagem |
| first_response_at | timestamptz | Primeira resposta do atendente |
| resolved_at | timestamptz | Quando foi resolvida |

### 4. Tabela `whatsapp_messages`

Mensagens individuais de cada conversa.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | ID interno |
| timelines_message_id | text UNIQUE | message_uid do Timelines.ai |
| conversation_id | uuid FK | Conversa |
| sender_type | text | 'contact', 'agent', 'system' |
| sender_id | uuid | ID do atendente (se agent) |
| content | text | Conteúdo da mensagem |
| message_type | enum | text/image/audio/video/etc |
| status | enum | sent/delivered/read/failed |
| media_url | text | URL da mídia |
| media_mime_type | text | Tipo MIME |
| metadata | jsonb | Dados extras |

### 5. Tabela `whatsapp_conversation_analysis` (Opcional - IA)

Análise de conversas com IA.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | ID interno |
| conversation_id | uuid FK UNIQUE | Conversa analisada |
| overall_score | integer | Score geral (0-10) |
| response_quality | integer | Qualidade das respostas |
| tone_score | integer | Tom e cordialidade |
| resolution_effectiveness | integer | Eficácia na resolução |
| professionalism | integer | Profissionalismo |
| sentiment | text | positive/neutral/negative |
| summary | text | Resumo da conversa |
| strengths | text[] | Pontos fortes |
| improvements | text[] | Pontos a melhorar |
| message_count | integer | Número de mensagens |
| analyzed_at | timestamptz | Quando foi analisada |

## Edge Functions

### 1. `timelines-webhook` (Webhook - Público)

Recebe eventos do Timelines.ai e processa:

```text
Timelines.ai → Webhook → Processa Evento
                              │
                              ├── Upsert Canal (whatsapp_channels)
                              │
                              ├── Busca/Cria Pessoa (people)
                              │   └── Se não existe: cria com nome e WhatsApp
                              │
                              ├── Upsert Conversa (whatsapp_conversations)
                              │   └── Se resolvida + nova msg: reabre
                              │
                              ├── Insere Mensagem (whatsapp_messages)
                              │   └── Evita duplicatas por message_uid
                              │
                              └── Registra na Timeline (people_history)
                                  └── event_type: 'whatsapp_received'
```

**Payload esperado do Timelines.ai:**

```json
{
  "event_type": "message:received:new",
  "chat": {
    "chat_id": 45722353,
    "phone": "554391915894",
    "full_name": "Nome do Cliente"
  },
  "whatsapp_account": {
    "phone": "+554391243257",
    "full_name": "Nome da Empresa"
  },
  "message": {
    "text": "Olá, preciso de ajuda",
    "direction": "received",
    "timestamp": "2026-02-02 17:25:49 -0300",
    "message_uid": "uuid-da-mensagem",
    "sender": {
      "phone": "+554391915894",
      "full_name": "Nome do Cliente"
    },
    "attachments": []
  }
}
```

### 2. `send-whatsapp-message` (Autenticado)

Envia mensagens para contatos via Timelines.ai:

```text
Frontend → Edge Function → API Timelines.ai → WhatsApp
     │                            │
     │                            └── POST /chats/{chat_id}/messages
     │
     └── Salva localmente em whatsapp_messages
         + Registra em people_history
```

### 3. `analyze-whatsapp-conversation` (Autenticado - IA)

Analisa conversas com Lovable AI (Gemini):

```text
Busca Mensagens → Formata Transcript → Lovable AI → Salva Análise
                                          │
                                          └── Tool Calling para estruturar
                                              - Scores (0-10)
                                              - Sentimento
                                              - Resumo
                                              - Pontos fortes/melhorias
```

## Integração com Timeline Existente

### Novos Event Types para `people_history`

| Event Type | Descrição | Ícone Sugerido |
|------------|-----------|----------------|
| `whatsapp_received` | Mensagem recebida do contato | MessageCircle (verde) |
| `whatsapp_sent` | Mensagem enviada pelo atendente | Send (azul) |
| `whatsapp_conversation_started` | Nova conversa iniciada | MessageSquarePlus |
| `whatsapp_conversation_resolved` | Conversa resolvida | CheckCircle2 |

### Atualização do `PersonTimeline.tsx`

Adicionar suporte aos novos tipos de evento com ícones e cores do WhatsApp:

```text
Timeline da Pessoa
┌─────────────────────────────────────────────────────────────┐
│ 💬 WhatsApp: "Olá, preciso de um orçamento..."             │
│ há 5 minutos • Mensagem recebida                           │
├─────────────────────────────────────────────────────────────┤
│ 📤 WhatsApp: "Olá! Vou preparar seu orçamento..."          │
│ há 3 minutos • João Silva respondeu                        │
├─────────────────────────────────────────────────────────────┤
│ ✅ Conversa WhatsApp resolvida                             │
│ há 1 minuto • João Silva                                    │
└─────────────────────────────────────────────────────────────┘
```

## Frontend - Hooks e Componentes

### Novos Hooks

| Hook | Função |
|------|--------|
| `useWhatsAppConversations` | Lista conversas com filtros |
| `useWhatsAppConversation` | Detalhes de uma conversa |
| `useWhatsAppMessages` | Mensagens com realtime |
| `useSendWhatsAppMessage` | Mutation para enviar |
| `useWhatsAppAnalysis` | Buscar análise IA |

### Realtime para Mensagens

```typescript
supabase
  .channel(`whatsapp-${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'whatsapp_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, callback)
  .subscribe();
```

## Configurações Necessárias

### Secrets

| Secret | Descrição |
|--------|-----------|
| `TIMELINES_API_TOKEN` | Token da API do Timelines.ai |
| `LOVABLE_API_KEY` | Já configurado (para IA) |

### config.toml

```toml
[functions.timelines-webhook]
verify_jwt = false

[functions.send-whatsapp-message]
verify_jwt = false

[functions.analyze-whatsapp-conversation]
verify_jwt = false
```

### Webhook no Timelines.ai

Configurar no painel do Timelines.ai:
- **URL**: `https://yqidjdpxkzgrhneaxngn.supabase.co/functions/v1/timelines-webhook`
- **Eventos**: `message:received:new`, `chat:incoming:new`

## Arquivos a Criar/Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `migration` | DB | Criar tabelas e ENUMs |
| `supabase/functions/timelines-webhook/index.ts` | Edge | Webhook receber mensagens |
| `supabase/functions/send-whatsapp-message/index.ts` | Edge | Enviar mensagens |
| `supabase/functions/analyze-whatsapp-conversation/index.ts` | Edge | Análise IA |
| `supabase/config.toml` | Config | Adicionar funções |
| `src/hooks/useWhatsAppConversations.ts` | Hook | Lista conversas |
| `src/hooks/useWhatsAppMessages.ts` | Hook | Mensagens + realtime |
| `src/hooks/useSendWhatsAppMessage.ts` | Hook | Enviar mensagem |
| `src/components/people/detail/PersonTimeline.tsx` | UI | Adicionar ícones WhatsApp |
| `src/components/whatsapp/ConversationList.tsx` | UI | Lista de conversas |
| `src/components/whatsapp/ConversationPanel.tsx` | UI | Painel de chat |
| `src/components/whatsapp/MessageBubble.tsx` | UI | Bolha de mensagem |

## Fluxo Completo

```text
                    ┌────────────────────────────────┐
                    │        Timelines.ai            │
                    │      (WhatsApp Business)       │
                    └────────────┬───────────────────┘
                                 │
                    ┌────────────▼───────────────────┐
                    │    timelines-webhook           │
                    │    (Edge Function)             │
                    └────────────┬───────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ whatsapp_channels│   │    people        │   │ whatsapp_       │
│                 │   │ (cria se novo)   │   │ conversations   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
                                 │                      │
                                 │                      ▼
                                 │           ┌─────────────────┐
                                 │           │ whatsapp_       │
                                 │           │ messages        │
                                 │           └─────────────────┘
                                 │
                                 ▼
                      ┌─────────────────┐
                      │ people_history  │
                      │ (timeline)      │
                      └─────────────────┘
                                 │
                                 ▼
                      ┌─────────────────┐
                      │   Frontend      │
                      │  (Realtime)     │
                      └─────────────────┘
```

## Próximos Passos (Pós-Aprovação)

1. Solicitar `TIMELINES_API_TOKEN`
2. Executar migração do banco de dados
3. Criar edge functions
4. Atualizar componente PersonTimeline
5. Criar hooks React Query
6. Criar componentes de chat (opcional - fase 2)
7. Testar integração end-to-end

