

# Pesquisa de Empresa + Email Ultra-Personalizado

## Objetivo
Criar o fluxo completo: pesquisar empresa na web via Perplexity, combinar com dados do CRM, e gerar email ultra-personalizado com Gemini.

## Alteracoes

### 1. Nova Edge Function: `research-company/index.ts`
- Recebe: `organizationId`, `recipientName`, `emailType`, `customInstructions`
- **Etapa 1**: Busca dados da organizacao no CRM (nome, CNPJ, cidade, ramo de seguro, seguradoras, deals)
- **Etapa 2**: Chama Perplexity (`sonar`, `search_recency_filter: month`) com query inteligente sobre a empresa
- **Etapa 3**: Envia pesquisa + dados CRM para Gemini (`google/gemini-2.5-pro`) gerar email personalizado
- Retorna: `{ research_summary, citations, subject, body, phase }`
- Autenticacao via `getClaims()`, `verify_jwt = false`

### 2. Registrar funcao no `supabase/config.toml`
- Adicionar `[functions.research-company]` com `verify_jwt = false`

### 3. Novo Hook: `src/hooks/useResearchAndGenerateEmail.ts`
- Estados: `phase` ("idle" | "researching" | "generating" | "done"), `researchSummary`, `citations`
- Funcao `researchAndGenerate(params)` que chama a edge function
- Retorna resultado com subject, body, resumo da pesquisa e fontes

### 4. Atualizar `EmailComposerDialog.tsx`
- Quando `entityType === 'organization'`: mostrar secao de pesquisa com IA
- Textarea opcional para instrucoes customizadas
- Botao "Pesquisar e personalizar com IA" com icone de globo/lupa
- Loading em 2 fases visuais: "Pesquisando informacoes..." -> "Gerando email..."
- Card colapsavel (Collapsible) mostrando o resumo da pesquisa e fontes apos conclusao
- Preenche automaticamente subject e body

## Detalhes Tecnicos

### Query do Perplexity
```text
"[Nome] [CNPJ] Brasil: noticias recentes, produtos e servicos, 
tamanho da empresa, segmento de atuacao, desafios do setor"
```

### Prompt do Gemini
Inclui:
- Dados CRM: nome, CNPJ, cidade, ramos de seguro, seguradoras preferidas, premio estimado
- Pesquisa web: resumo do Perplexity
- Instrucoes customizadas do usuario
- Tipo de email (proposta, follow-up, apresentacao, personalizado)

### Arquivos novos
- `supabase/functions/research-company/index.ts`
- `src/hooks/useResearchAndGenerateEmail.ts`

### Arquivos modificados
- `supabase/config.toml` - registro da funcao
- `src/components/email/EmailComposerDialog.tsx` - UI de pesquisa + card de resumo

