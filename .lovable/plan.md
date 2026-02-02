
# Plano: Componentes de Chat WhatsApp no CRM

## Objetivo

Criar uma interface de chat completa para visualizar e responder conversas WhatsApp diretamente no CRM, permitindo que vendedores gerenciem comunicações sem sair da plataforma.

## Análise do Sistema Existente

### Hooks Já Implementados
| Hook | Função |
|------|--------|
| `useWhatsAppConversations` | Lista conversas com filtros |
| `useWhatsAppMessages` | Mensagens + realtime subscription |
| `useSendWhatsAppMessage` | Mutation para enviar mensagens |
| `usePersonWhatsAppConversations` | Conversas de uma pessoa específica |
| `useWhatsAppAnalysis` | Análise IA da conversa |

### Padrões de UI Identificados
- Cards com classe `ios-glass` para glassmorphism
- Tabs para organização de conteúdo em detalhes
- ScrollArea para listas com scroll
- Badges para status e labels
- Cores emerald/green para WhatsApp (já implementado na timeline)

## Arquitetura dos Componentes

```text
┌─────────────────────────────────────────────────────────────────┐
│                   ESTRUTURA DE COMPONENTES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PersonDetails.tsx                                              │
│  └── Tab "WhatsApp"                                             │
│      └── PersonWhatsApp.tsx                                     │
│          ├── ConversationList.tsx (se múltiplas conversas)      │
│          └── ChatPanel.tsx                                      │
│              ├── ChatHeader.tsx                                 │
│              ├── MessageList.tsx                                │
│              │   └── MessageBubble.tsx (múltiplas)              │
│              └── ChatInput.tsx                                  │
│                                                                 │
│  WhatsAppInbox.tsx (Página dedicada - opcional fase 2)          │
│  └── Layout split: Lista | Chat                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes a Criar

### 1. PersonWhatsApp.tsx
Container principal para a aba WhatsApp no detalhe da pessoa.

```text
┌─────────────────────────────────────────────────────────────────┐
│ 💬 Conversas WhatsApp                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Se nenhuma conversa]                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │     💬                                                   │   │
│  │     Nenhuma conversa WhatsApp                           │   │
│  │     As mensagens aparecerão aqui quando                 │   │
│  │     o contato enviar uma mensagem.                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Se tem conversas]                                             │
│  └── ChatPanel com conversa mais recente                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. ChatPanel.tsx
Painel de chat com header, mensagens e input.

```text
┌─────────────────────────────────────────────────────────────────┐
│ ChatHeader                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📱 WhatsApp • Via Canal Empresarial                         │ │
│ │ Status: 🟢 Em atendimento        [Resolver] [Analisar IA]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ MessageList (ScrollArea)                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │  ┌────────────────────────┐                                │ │
│ │  │ Olá, preciso de ajuda  │                                │ │
│ │  │ com meu seguro         │  ← Mensagem do contato         │ │
│ │  │ 14:32 ✓✓               │                                │ │
│ │  └────────────────────────┘                                │ │
│ │                                                             │ │
│ │                    ┌────────────────────────┐              │ │
│ │  Atendente →       │ Olá! Vou verificar     │              │ │
│ │                    │ isso para você.        │              │ │
│ │                    │ 14:35 ✓✓               │              │ │
│ │                    └────────────────────────┘              │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ChatInput                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Digite sua mensagem...                              ] [📤]│ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3. MessageBubble.tsx
Bolha de mensagem individual com suporte a diferentes tipos.

| Tipo | Visual |
|------|--------|
| text | Texto simples |
| image | Thumbnail clicável |
| audio | Player de áudio inline |
| video | Player de vídeo inline |
| document | Ícone + nome do arquivo |
| location | Mini mapa ou link |

### 4. ChatInput.tsx
Campo de entrada com envio via Enter ou botão.

- Textarea auto-resize
- Envio: Enter (ou Shift+Enter para nova linha)
- Estado de loading durante envio
- Desabilitado se conversa resolvida

### 5. ChatHeader.tsx
Header com informações da conversa e ações.

- Status da conversa (pending/in_progress/resolved)
- Canal de origem
- Botão "Resolver" para marcar como resolvida
- Botão "Analisar IA" para gerar análise
- Data da última mensagem

## Integração com PersonDetails

Adicionar nova aba "WhatsApp" com contador de conversas:

```typescript
<TabsTrigger value="whatsapp" className="flex-1 sm:flex-none">
  <MessageCircle className="h-4 w-4 mr-1 text-emerald-500" />
  WhatsApp ({conversations.length})
</TabsTrigger>
```

## Funcionalidades

### Envio de Mensagens
1. Usuário digita mensagem
2. Clica enviar ou pressiona Enter
3. Mutation `useSendWhatsAppMessage` é chamada
4. Mensagem aparece imediatamente (optimistic update via realtime)
5. Toast de sucesso/erro

### Recebimento em Tempo Real
1. Realtime subscription já implementada em `useWhatsAppMessages`
2. Novas mensagens aparecem automaticamente
3. Scroll automático para última mensagem

### Resolução de Conversa
1. Botão "Resolver" atualiza status para 'resolved'
2. Desabilita input de mensagens
3. Registra evento na timeline da pessoa

### Análise IA (Opcional)
1. Botão "Analisar" chama edge function
2. Exibe loading enquanto processa
3. Mostra resumo e scores em card colapsável

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/whatsapp/ChatPanel.tsx` | Painel principal do chat |
| `src/components/whatsapp/ChatHeader.tsx` | Header com status e ações |
| `src/components/whatsapp/MessageList.tsx` | Lista de mensagens com scroll |
| `src/components/whatsapp/MessageBubble.tsx` | Bolha de mensagem individual |
| `src/components/whatsapp/ChatInput.tsx` | Campo de entrada de mensagem |
| `src/components/whatsapp/ConversationPicker.tsx` | Seletor se múltiplas conversas |
| `src/components/whatsapp/AnalysisCard.tsx` | Card com análise IA |
| `src/components/people/detail/PersonWhatsApp.tsx` | Container para aba WhatsApp |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/PersonDetails.tsx` | Adicionar aba WhatsApp e importar componentes |
| `src/hooks/useWhatsAppConversations.ts` | Adicionar mutation para atualizar status |

## Hook Adicional

### useUpdateConversation.ts
```typescript
// Mutation para atualizar status, assigned_to, tags, etc.
export function useUpdateWhatsAppConversation() {
  return useMutation({
    mutationFn: async ({ conversationId, data }) => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update(data)
        .eq('id', conversationId);
      if (error) throw error;
    },
    // ... invalidate queries
  });
}
```

## Design Visual

### Cores WhatsApp
- Fundo bolha contato: `bg-muted` (cinza claro)
- Fundo bolha agente: `bg-emerald-500/10` (verde claro)
- Texto: `text-foreground`
- Timestamp: `text-muted-foreground text-xs`
- Status checks: `text-emerald-500` (lido), `text-muted-foreground` (enviado)

### Responsividade
- Em mobile: chat ocupa largura total
- Em desktop: mantém proporções adequadas dentro da área de tabs
- Scroll suave com `scroll-smooth`

## Fluxo de Uso

```text
Usuário acessa pessoa → Clica aba "WhatsApp"
                              │
                              ├── Sem conversas → Mensagem vazia
                              │
                              └── Com conversas → Exibe ChatPanel
                                                      │
                                                      ├── Lê mensagens
                                                      ├── Digita resposta
                                                      └── Envia via API
```

## Resultado Esperado

1. Vendedor abre detalhe de uma pessoa
2. Vê aba "WhatsApp" com contador de conversas
3. Clica e visualiza histórico de mensagens
4. Pode responder diretamente pelo CRM
5. Mensagens enviadas aparecem em tempo real
6. Pode resolver conversa quando atendimento termina
7. Pode solicitar análise IA para feedback de qualidade
