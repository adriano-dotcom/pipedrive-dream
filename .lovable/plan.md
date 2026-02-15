
# Adicionar Pesquisa Inteligente de Email para Pessoas

## Contexto
Atualmente, a secao "Pesquisa inteligente com IA" so aparece quando o email e enviado a partir de uma organizacao (`entityType === 'organization'`). O objetivo e habilitar essa mesma funcionalidade para pessoas, puxando os dados da empresa vinculada ao contato.

## Alteracoes

### 1. Modificar `EmailComposerDialog.tsx`
- Aceitar uma nova prop opcional `organizationId` para quando o email for enviado de uma pessoa com empresa vinculada
- Alterar a condicao `entityType === 'organization'` para tambem mostrar a secao de pesquisa quando o contato tiver uma organizacao vinculada
- Quando `entityType === 'person'`, usar o `organizationId` passado via prop para chamar a pesquisa

### 2. Modificar `EmailButton.tsx`
- Aceitar uma nova prop opcional `organizationId` e repassar para o `EmailComposerDialog`

### 3. Modificar `PersonSidebar.tsx`
- Passar o `organization_id` da pessoa como prop `organizationId` no `EmailButton`

### 4. Modificar `PersonEmails.tsx` e `SentEmailsList.tsx`
- Garantir que o botao de compor email na aba de emails da pessoa tambem passe o `organizationId`

### 5. Atualizar a Edge Function `research-company/index.ts`
- Adicionar busca de dados da pessoa (nome, cargo, email, telefone) quando um `personId` for fornecido
- Incluir esses dados no contexto CRM enviado ao Gemini para personalizar melhor o email

## Detalhes Tecnicos

### Fluxo
1. Usuario abre email a partir de uma pessoa que tem empresa vinculada
2. O dialog recebe `organizationId` da empresa vinculada
3. A secao de pesquisa IA aparece (antes so aparecia para organizacoes)
4. Ao clicar "Pesquisar empresa e gerar email", a edge function busca dados da empresa + dados do contato
5. O email gerado e personalizado com nome, cargo do contato E dados da empresa

### Props novas
- `EmailComposerDialog`: `organizationId?: string`
- `EmailButton`: `organizationId?: string`

### Condicao de exibicao da pesquisa
De: `entityType === 'organization'`
Para: `entityType === 'organization' || !!organizationId`

### Edge Function
- Novo parametro opcional: `personId`
- Se fornecido, busca dados da pessoa (nome, cargo, email) e inclui no contexto CRM
- O prompt do Gemini passa a incluir: "Destinatario: [nome], Cargo: [cargo], Email: [email]"

### Arquivos modificados
- `src/components/email/EmailComposerDialog.tsx`
- `src/components/email/EmailButton.tsx`
- `src/components/people/detail/PersonSidebar.tsx`
- `supabase/functions/research-company/index.ts`
