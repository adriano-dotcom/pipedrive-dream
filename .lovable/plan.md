
# Variáveis de Template no E-mail em Massa

## Objetivo
Permitir o uso de variáveis dinâmicas nos templates e no corpo do e-mail em massa, que serao substituidas automaticamente pelos dados de cada destinatario no momento do envio.

## Variaveis Disponiveis

| Variavel | Descricao | Fonte |
|----------|-----------|-------|
| `{{primeiro_nome}}` | Primeiro nome da pessoa | `people.name` (split) |
| `{{nome_completo}}` | Nome completo | `people.name` |
| `{{empresa}}` | Nome da organizacao | `organizations.name` (via `people.organization_id`) |
| `{{cidade}}` | Cidade da organizacao | `organizations.address_city` |
| `{{email}}` | E-mail do destinatario | `people.email` |
| `{{cargo}}` | Cargo da pessoa | `people.job_title` |

---

## Alteracoes

### 1. Frontend - BulkEmailComposerDialog
- Adicionar um painel/barra com botoes de variavel (chips clicaveis) que inserem `{{variavel}}` no corpo do e-mail
- Variaveis: Primeiro Nome, Nome Completo, Empresa, Cidade, Cargo, Email
- Ao clicar, insere o texto da variavel na posicao atual do editor
- Adicionar dica visual explicando que as variaveis serao substituidas por destinatario

### 2. Frontend - Recipient Interface
- Expandir a interface `Recipient` para incluir `organization_name`, `organization_city`, `job_title`
- Atualizar `People.tsx` para buscar e passar esses dados ao abrir o dialog

### 3. Frontend - People.tsx
- Ajustar a query de pessoas para incluir join com organizacao (`organizations(name, address_city)`)
- Passar os dados adicionais no mapeamento de recipients

### 4. Backend - process-bulk-email
- Antes de enviar cada email, buscar dados completos do person + organization
- Substituir todas as variaveis `{{...}}` no subject E no body por destinatario
- Se a variavel nao tiver valor, substituir por string vazia

### 5. Hook useBulkEmail
- Atualizar `CreateCampaignParams` para armazenar os dados extras por recipient (organization_name, organization_city, job_title) na tabela `bulk_email_recipients`

---

## Detalhes Tecnicos

### Novas colunas em `bulk_email_recipients`
Adicionar campos para armazenar dados da pessoa no momento do envio (snapshot):
- `organization_name` (text, nullable)
- `organization_city` (text, nullable) 
- `job_title` (text, nullable)

### Funcao de substituicao (edge function)
```text
function replaceVariables(text, recipient):
  primeiro_nome = recipient.name.split(" ")[0]
  text = text.replace("{{primeiro_nome}}", primeiro_nome)
  text = text.replace("{{nome_completo}}", recipient.name)
  text = text.replace("{{empresa}}", recipient.organization_name || "")
  text = text.replace("{{cidade}}", recipient.organization_city || "")
  text = text.replace("{{cargo}}", recipient.job_title || "")
  text = text.replace("{{email}}", recipient.email || "")
  return text
```

A substituicao e aplicada tanto no `subject` quanto no `body` de cada email.

### UI dos botoes de variavel
Uma barra horizontal com chips/badges clicaveis acima do editor:
- `Primeiro Nome` -> insere `{{primeiro_nome}}`
- `Nome Completo` -> insere `{{nome_completo}}`
- `Empresa` -> insere `{{empresa}}`
- `Cidade` -> insere `{{cidade}}`
- `Cargo` -> insere `{{cargo}}`
- `Email` -> insere `{{email}}`

### Arquivos modificados
- `src/components/email/BulkEmailComposerDialog.tsx` - barra de variaveis + interface expandida
- `src/pages/People.tsx` - query com join de organization + mapeamento expandido
- `src/hooks/useBulkEmail.ts` - campos extras no recipient
- `supabase/functions/process-bulk-email/index.ts` - logica de substituicao de variaveis
- Migracao SQL para adicionar colunas em `bulk_email_recipients`
