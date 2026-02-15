

# Corrigir Prompt do Research-Company: Nome do Corretor e Assinatura

## Problemas Identificados
1. O prompt nao inclui o nome real do corretor — a IA inventa "Gemini" como nome do remetente
2. A edge function `research-company` nao busca o perfil do usuario nem a assinatura, diferente da `generate-email` que ja faz isso

## Alteracoes

### 1. Modificar `supabase/functions/research-company/index.ts`

**Buscar dados do usuario autenticado:**
- Extrair o `userId` do token JWT (ja faz `getClaims`)
- Buscar `full_name` e `phone` da tabela `profiles` (igual ao `generate-email`)
- Buscar `signature_html` da tabela `user_signatures` (onde `is_active = true`)

**Atualizar o prompt:**
- Adicionar o nome real do corretor: "Seu nome é [nome do perfil]"
- Adicionar regra: "Assine o email com o nome do corretor fornecido, NAO invente nomes"
- NÃO incluir assinatura HTML no corpo (ela sera adicionada pelo frontend ao enviar)

**Incluir no contexto CRM:**
- Adicionar secao "DADOS DO CORRETOR" com nome e telefone

### 2. Atualizar regras do prompt

Adicionar ao bloco REGRAS:
- "Seu nome como corretor é: [nome]. Use este nome para se apresentar."
- "NÃO invente nomes de corretor ou empresa de corretagem"
- "NÃO inclua assinatura no final do email — ela sera adicionada automaticamente"

## Detalhes Tecnicos

### Codigo a adicionar (apos getClaims, antes da busca da organizacao):

```text
// Buscar perfil do usuario
const userId = claimsData.claims.sub;
const { data: profile } = await supabase
  .from("profiles")
  .select("full_name, phone")
  .eq("user_id", userId)
  .maybeSingle();

const senderName = profile?.full_name || "Corretor";
```

### Prompt atualizado (trecho):

```text
Você é ${senderName}, um corretor de seguros brasileiro...

REGRAS:
- Seu nome é ${senderName}. Use este nome ao se apresentar.
- NÃO invente nomes de corretor.
- NÃO inclua assinatura no final do email (sera adicionada automaticamente)
```

### Arquivos modificados
- `supabase/functions/research-company/index.ts` (buscar perfil + atualizar prompt)

