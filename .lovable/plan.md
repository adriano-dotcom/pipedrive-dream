
# Configurar Dominio jacometo.com.br no Resend

## Passo 1: Configurar o dominio no Resend (voce faz manualmente)

1. Acesse [resend.com/domains](https://resend.com/domains)
2. Clique em **"Add Domain"**
3. Digite: `jacometo.com.br`
4. O Resend vai mostrar registros DNS que voce precisa adicionar no seu provedor de dominio:
   - **MX record** - para receber emails (opcional)
   - **TXT record (SPF)** - para autorizacao de envio
   - **CNAME records (DKIM)** - para assinatura dos emails
5. Adicione esses registros no painel do seu provedor de dominio (Registro.br, GoDaddy, Cloudflare, etc.)
6. Volte ao Resend e clique em **"Verify"** - pode levar ate 72 horas, mas geralmente e rapido

## Passo 2: Atualizar as Edge Functions (eu farei apos sua aprovacao)

Trocar o remetente `onboarding@resend.dev` por um endereco do dominio verificado em **4 arquivos**:

| Arquivo | Remetente atual | Novo remetente |
|---------|----------------|----------------|
| `notify-activity-assignment/index.ts` | `CRM Jacometo <onboarding@resend.dev>` | `CRM Jacometo <crm@jacometo.com.br>` |
| `send-email/index.ts` | `${fromName} <onboarding@resend.dev>` | `${fromName} <crm@jacometo.com.br>` |
| `send-mention-notification/index.ts` | `CRM Jacometo <onboarding@resend.dev>` | `CRM Jacometo <crm@jacometo.com.br>` |
| `process-bulk-email/index.ts` | `${fromName} <onboarding@resend.dev>` | `${fromName} <crm@jacometo.com.br>` |

Todas as functions serao reimplantadas automaticamente apos a alteracao.

---

**Importante:** O endereco `crm@jacometo.com.br` nao precisa existir como caixa de entrada real - o Resend so precisa que o dominio esteja verificado. Se preferir outro endereco (ex: `noreply@jacometo.com.br`), me avise.

**Sequencia recomendada:**
1. Primeiro configure e verifique o dominio no Resend
2. Depois aprove este plano para eu atualizar o codigo
