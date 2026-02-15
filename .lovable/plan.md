

# Pesquisa de Empresa + Email Ultra-Personalizado

## Objetivo
Adicionar um fluxo onde o usuario pode pesquisar informacoes de uma empresa na web (via Perplexity) e usar esses dados junto com o CRM para gerar um email altamente personalizado.

## Pre-requisito: Conectar Perplexity
O Perplexity ainda nao esta conectado ao projeto. Sera necessario conecta-lo para habilitar buscas na web em tempo real.

## Arquitetura

```text
[UI: Botao "Pesquisar + Gerar"]
        |
        v
[Edge Function: research-company]
        |
        +---> Perplexity API (busca web sobre a empresa)
        |
        +---> Lovable AI / Gemini (gera email com contexto enriquecido)
        |
        v
[Retorna: research_summary + subject + body]
```

## Alteracoes

### 1. Conectar Perplexity
- Usar o conector Perplexity para disponibilizar a `PERPLEXITY_API_KEY` nas edge functions

### 2. Nova Edge Function: `research-company`
- **Etapa 1 - Pesquisa**: Chama a API do Perplexity (`sonar`) com uma query inteligente sobre a empresa (nome, CNPJ, segmento, noticias recentes, produtos, tamanho)
- **Etapa 2 - Geracao**: Envia o resultado da pesquisa + dados do CRM (organizacao, pessoas vinculadas, deals) como contexto para o Gemini gerar o email
- Recebe parametros: `organizationId`, `recipientName`, `emailType`, `customInstructions`
- Retorna: `{ research_summary, subject, body }`

### 3. Novo Hook: `useResearchAndGenerateEmail`
- Estado: `isResearching`, `isGenerating`, `researchSummary`
- Funcao `researchAndGenerate(params)` que chama a edge function
- Exibe progresso em 2 etapas (pesquisando... gerando...)

### 4. UI - Botao no EmailComposerDialog e OrganizationSidebar
- Adicionar botao "Pesquisar empresa e gerar email" no `EmailComposerDialog` quando `entityType === 'organization'`
- Ao clicar:
  1. Mostra indicador "Pesquisando informacoes da empresa..."
  2. Depois mostra "Gerando email personalizado..."
  3. Preenche subject + body
  4. Mostra um card colapsavel com o resumo da pesquisa para o usuario revisar

### 5. Campo opcional de instrucoes customizadas
- Textarea para o usuario adicionar contexto extra antes de gerar (ex: "Focar em seguro de frota", "Mencionar a inauguracao da nova filial")

## Detalhes Tecnicos

### Edge Function `research-company/index.ts`

**Query do Perplexity:**
```text
"[Nome da empresa] [CNPJ] Brasil: noticias recentes, 
produtos e servicos, tamanho da empresa, segmento de atuacao, 
desafios do setor, expansao recente"
```

Parametros da API:
- model: `sonar`
- search_recency_filter: `month` (ultimas noticias)

**Prompt para Gemini (geracao do email):**
O prompt incluira:
- Dados do CRM: nome da org, CNPJ, cidade, ramo de seguro, seguradoras preferidas, valor estimado de premio
- Pesquisa web: resumo retornado pelo Perplexity
- Instrucoes customizadas do usuario
- Tipo de email (proposta, follow-up, etc.)

### Modelo para geracao
- `google/gemini-2.5-pro` para melhor qualidade na personalizacao (contexto grande + raciocinio complexo)

### Arquivos novos
- `supabase/functions/research-company/index.ts` - edge function com Perplexity + Gemini
- `src/hooks/useResearchAndGenerateEmail.ts` - hook frontend

### Arquivos modificados
- `src/components/email/EmailComposerDialog.tsx` - botao de pesquisa + card de resumo + textarea de instrucoes
- `supabase/config.toml` - registro da nova funcao

### Fluxo da UI

1. Usuario abre EmailComposerDialog para uma organizacao
2. Ve botao "Pesquisar e personalizar com IA" (destaque visual)
3. Opcionalmente escreve instrucoes customizadas no textarea
4. Clica no botao
5. Loading em 2 fases: "Pesquisando..." -> "Gerando..."
6. Email preenchido automaticamente
7. Card colapsavel mostra o resumo da pesquisa com as fontes
8. Usuario revisa, edita se quiser, e envia

