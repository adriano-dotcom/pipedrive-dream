
# Plano: Página de Administração Timelines.ai

## Objetivo

Criar uma página administrativa em `/timelinesai` para gerenciar os canais (contas WhatsApp) conectados ao sistema, permitindo vincular cada canal a um vendedor específico e controlar o status de ativação.

## Análise do Sistema Existente

### Estrutura Atual de `whatsapp_channels`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID interno |
| timelines_channel_id | text | ID da conta no Timelines.ai |
| name | text | Nome da conta (auto-preenchido pelo webhook) |
| phone_number | text | Número do WhatsApp |
| is_active | boolean | Se está ativo |
| metadata | jsonb | Dados adicionais |

### Alteração Necessária no Banco de Dados

Adicionar coluna `owner_id` para vincular canal a um vendedor:

```sql
ALTER TABLE whatsapp_channels 
ADD COLUMN owner_id uuid REFERENCES profiles(id);
```

Isso permitirá associar cada conta WhatsApp (canal) a um membro da equipe.

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────┐
│                      /timelinesai                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TimelinesAdmin.tsx (Página)                                    │
│  ├── Header com título e descrição                              │
│  ├── Card com tabela de canais                                  │
│  │   └── ChannelTable.tsx                                       │
│  │       ├── Nome do canal                                      │
│  │       ├── Número do telefone                                 │
│  │       ├── Vendedor responsável (Select)                      │
│  │       ├── Status (Badge ativo/inativo)                       │
│  │       └── Ações (editar, ativar/desativar)                   │
│  └── ChannelFormSheet.tsx (edição/criação manual)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Banco de Dados

### Migração

```sql
-- Adicionar owner_id à tabela whatsapp_channels
ALTER TABLE public.whatsapp_channels 
ADD COLUMN owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Index para performance
CREATE INDEX idx_whatsapp_channels_owner_id ON public.whatsapp_channels(owner_id);
```

## Componentes

### 1. TimelinesAdmin.tsx (Página)

Página principal acessível apenas para admins, localizada em `/timelinesai`.

Estrutura visual:
```text
┌─────────────────────────────────────────────────────────────────┐
│ 📱 Timelines.ai - Administração                                │
│ Gerencie os canais WhatsApp conectados ao sistema              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [+ Adicionar Canal Manual]                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ Canais WhatsApp                                             │
│  ├─────────────────────────────────────────────────────────────┤
│  │ Nome          │ Telefone       │ Vendedor   │ Status │ Ação │
│  │───────────────┼────────────────┼────────────┼────────┼──────│
│  │ Leonardo S.   │ +55 43 9191... │ [Select ▼] │ 🟢     │ ⚙️   │
│  │ Adriana J.    │ +55 43 9124... │ [Select ▼] │ 🟢     │ ⚙️   │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ ℹ️ Configuração do Webhook                                  │
│  │ URL: https://yqidjdpxkzgrhneaxngn.supabase.co/functions/... │
│  │ [Copiar URL]                                                │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. ChannelFormSheet.tsx

Sheet para edição de canal existente ou criação manual:

```text
┌──────────────────────────────────────┐
│ Editar Canal                         │
├──────────────────────────────────────┤
│                                      │
│ Nome do Canal                        │
│ [Adriana Jacometo              ]     │
│                                      │
│ Número do WhatsApp                   │
│ [+55 43 91243257               ]     │
│                                      │
│ Vendedor Responsável                 │
│ [Select: Adriana Jacometo    ▼]      │
│                                      │
│ Timelines Channel ID                 │
│ [554391243257                  ] 🔒  │
│                                      │
│ Status                               │
│ [✓] Canal ativo                      │
│                                      │
│          [Cancelar] [Salvar]         │
└──────────────────────────────────────┘
```

## Hooks

### useWhatsAppChannels.ts

```typescript
// Lista todos os canais com owner
export function useWhatsAppChannels() {
  return useQuery({
    queryKey: ['whatsapp-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_channels')
        .select(`
          *,
          owner:owner_id (id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Mutation para atualizar canal
export function useUpdateWhatsAppChannel() {
  return useMutation({
    mutationFn: async ({ channelId, data }) => {
      const { error } = await supabase
        .from('whatsapp_channels')
        .update(data)
        .eq('id', channelId);
      if (error) throw error;
    },
    // invalidate queries
  });
}
```

## Proteção de Acesso (Admin Only)

A página será protegida para acesso apenas por administradores:

```typescript
// Em TimelinesAdmin.tsx
const { isAdmin } = useAuth();

if (!isAdmin) {
  return <Navigate to="/" replace />;
}
```

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `migration` | Adicionar owner_id à whatsapp_channels |
| `src/pages/TimelinesAdmin.tsx` | Página de administração |
| `src/components/timelines/ChannelTable.tsx` | Tabela de canais |
| `src/components/timelines/ChannelFormSheet.tsx` | Sheet de edição |
| `src/hooks/useWhatsAppChannels.ts` | Hooks para canais |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/timelinesai` |
| `src/components/layout/AppSidebar.tsx` | Adicionar link (apenas para admins) |

## Funcionalidades

### 1. Listagem de Canais
- Exibir todos os canais cadastrados
- Mostrar nome, telefone, vendedor vinculado e status
- Ordenar por data de criação

### 2. Vinculação de Vendedor
- Select com lista de team members
- Atualização imediata ao selecionar
- Possibilidade de desvincular (opção "Nenhum")

### 3. Ativar/Desativar Canal
- Toggle para ativar ou desativar canal
- Canais desativados não processam mensagens (futura implementação no webhook)

### 4. Edição Manual
- Editar nome do canal
- Alterar telefone
- Mudar vendedor responsável

### 5. Criação Manual (Opcional)
- Permitir criar canal manualmente antes do webhook
- Útil para pré-configurar vendedores

### 6. Informações do Webhook
- Card com URL do webhook para copiar
- Instruções de configuração no Timelines.ai

## Fluxo de Uso

```text
Admin acessa /timelinesai
         │
         ├── Vê lista de canais existentes
         │   (criados automaticamente pelo webhook)
         │
         ├── Vincula cada canal a um vendedor
         │   (Seleciona no dropdown)
         │
         ├── Ativa/desativa canais conforme necessário
         │
         └── Copia URL do webhook para configurar no Timelines.ai
```

## Resultado Esperado

1. Admin tem visão centralizada de todos os canais WhatsApp
2. Pode vincular cada canal a um vendedor específico
3. Pode desativar canais que não devem receber mensagens
4. Tem acesso fácil à URL do webhook para configuração
5. Interface segura acessível apenas por administradores
