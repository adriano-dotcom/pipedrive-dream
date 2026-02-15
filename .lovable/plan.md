
# Envio de E-mail em Massa a partir de /people

## Visao Geral

Criar um sistema completo de e-mail marketing em massa integrado a listagem de Pessoas, com fila de envio, cadencia controlada, tracking de abertura e gerenciamento automatico de erros (bounces).

---

## Fase 1: Banco de Dados

### Nova tabela: `bulk_email_campaigns`
Armazena cada campanha de envio em massa.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| subject | text | Assunto do email |
| body | text | Corpo HTML |
| status | text | draft, queued, processing, completed, paused |
| total_recipients | int | Total de destinatarios |
| sent_count | int | Enviados com sucesso |
| failed_count | int | Falhas |
| opened_count | int | Abertos |
| rate_limit | int | Emails por minuto (default 10) |
| daily_limit | int | Limite diario (para cronjob) |
| scheduled_at | timestamptz | Se agendado |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

### Nova tabela: `bulk_email_recipients`
Cada destinatario individual da campanha.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| campaign_id | uuid FK | Referencia a campanha |
| person_id | uuid FK | Referencia a pessoa |
| email | text | Email do destinatario |
| name | text | Nome |
| status | text | pending, sent, failed, opened, bounced, blocked |
| sent_at | timestamptz | |
| opened_at | timestamptz | |
| error_message | text | |
| tracking_id | uuid | ID unico para pixel de rastreamento |
| created_at | timestamptz | |

### Novo campo na tabela `people`
- `email_status` (text, default 'active') - valores: active, bounced, blocked, unsubscribed

### RLS
- INSERT: `auth.uid() = created_by`
- SELECT: usuario logado ou admin
- UPDATE: criador ou admin

---

## Fase 2: Edge Functions

### 1. `process-bulk-email` (nova)
Funcao principal que processa a fila de envio:
- Busca a proxima campanha com status "queued" ou "processing"
- Busca recipients com status "pending" (limitado pelo rate_limit)
- Envia via Resend em lote respeitando cadencia
- Atualiza status de cada recipient
- Inclui pixel de rastreamento no corpo do email (imagem 1x1 transparente apontando para `track-email-open`)
- Atualiza contadores da campanha

### 2. `track-email-open` (nova)
Endpoint publico (sem JWT) que serve como pixel de rastreamento:
- Recebe `tracking_id` como parametro
- Retorna imagem 1x1 transparente (GIF)
- Atualiza `opened_at` e status para "opened" no recipient
- Atualiza `opened_count` na campanha

### 3. `resend-webhook` (nova)
Recebe webhooks do Resend para eventos como bounce e spam:
- Atualiza status do recipient para "bounced"
- Atualiza `email_status` da pessoa para "bounced" ou "blocked"
- Incrementa `failed_count` na campanha

### 4. Atualizar `send-email` existente
- Verificar `email_status` da pessoa antes de enviar (bloquear se bounced/blocked)
- Incluir pixel de rastreamento tambem nos emails individuais

---

## Fase 3: Frontend

### 1. Botao "Enviar Email em Massa" na toolbar de selecao
- Aparece quando ha pessoas selecionadas (ao lado de "Excluir" e "Mesclar")
- Filtra automaticamente pessoas sem email ou com email bloqueado
- Mostra contagem de destinatarios validos

### 2. Dialog `BulkEmailComposerDialog`
- Campo "Para": mostra contagem de destinatarios (ex: "15 pessoas selecionadas")
- Lista expansivel mostrando os destinatarios e seus emails
- Alerta visual para pessoas sem email (serao ignoradas)
- Alerta visual para emails bloqueados/bounced
- Seletor de template (reutiliza templates existentes)
- Geracao por IA (reutiliza `useGenerateEmail`)
- Editor rich-text para corpo
- Configuracao de cadencia: emails por minuto (slider, default 10)
- Opcao de agendar envio ou enviar agora
- Botao "Enviar para X pessoas"

### 3. Pagina/Dialog de acompanhamento de campanhas
- Listagem de campanhas anteriores com status
- Barra de progresso (enviados / total)
- Metricas: enviados, abertos, falhas
- Taxa de abertura em percentual
- Detalhes por destinatario com status individual
- Indicador visual de emails bloqueados

### 4. Indicadores na tabela de pessoas
- Badge ao lado do email quando `email_status` = bounced ou blocked
- Tooltip explicando por que o email esta bloqueado

---

## Fase 4: Cronjob (Futuro)
- Configurar `pg_cron` para chamar `process-bulk-email` periodicamente
- Respeitar `daily_limit` configurado na campanha
- Processar campanhas agendadas quando `scheduled_at <= now()`

---

## Detalhes Tecnicos

### Fluxo de envio

```text
Selecionar pessoas -> Compor email -> Criar campanha (status: queued)
-> Edge function process-bulk-email:
   1. Buscar recipients pendentes (LIMIT = rate_limit)
   2. Para cada recipient:
      a. Verificar email_status da pessoa (pular se blocked/bounced)
      b. Inserir pixel de tracking no HTML
      c. Enviar via Resend
      d. Atualizar status do recipient
   3. Atualizar contadores da campanha
   4. Se ainda ha pendentes -> manter status "processing"
   5. Se todos processados -> status "completed"
```

### Pixel de rastreamento
- URL: `https://{SUPABASE_URL}/functions/v1/track-email-open?tid={tracking_id}`
- Inserido como `<img src="..." width="1" height="1" style="display:none" />`
- A edge function retorna um GIF 1x1 transparente com headers de no-cache

### Dependencias
- Resend (ja configurado com RESEND_API_KEY)
- Lovable AI Gateway (ja configurado para geracao de email)
- Nenhuma nova dependencia frontend necessaria

### Arquivos novos
- `supabase/functions/process-bulk-email/index.ts`
- `supabase/functions/track-email-open/index.ts`
- `supabase/functions/resend-webhook/index.ts`
- `src/components/email/BulkEmailComposerDialog.tsx`
- `src/components/email/BulkEmailCampaignsList.tsx`
- `src/components/email/CampaignDetailDialog.tsx`
- `src/hooks/useBulkEmail.ts`

### Arquivos modificados
- `src/pages/People.tsx` - botao de envio em massa na toolbar
- `src/components/people/PeopleTable.tsx` - botao na barra de selecao
- `supabase/config.toml` - registrar novas edge functions
- `supabase/functions/send-email/index.ts` - verificar email_status antes de enviar

### Migracao SQL
- Criar tabelas `bulk_email_campaigns` e `bulk_email_recipients`
- Adicionar coluna `email_status` na tabela `people`
- Criar RLS policies para as novas tabelas
