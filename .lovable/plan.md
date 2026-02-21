
# Vincular Atividade a Vendedor e Notificar por Email

## O que sera feito

### 1. Adicionar campo "Responsavel" no formulario de atividades
- Novo campo Select no `ActivityFormSheet` com a lista de membros da equipe (usando o hook `useTeamMembers` ja existente)
- O usuario logado vem pre-selecionado como padrao
- Ao editar, mostra o responsavel atual da atividade

### 2. Salvar o responsavel no campo `assigned_to`
- O campo `assigned_to` ja existe na tabela `activities` no banco de dados
- Atualizar a mutation para usar o valor selecionado no formulario ao inves de sempre atribuir ao usuario logado

### 3. Enviar email ao responsavel quando for outro usuario
- Criar uma nova Edge Function `notify-activity-assignment` que:
  - Recebe os dados da atividade e o ID do usuario atribuido
  - Busca o email e nome do usuario no banco
  - Busca nomes da pessoa/organizacao/negocio vinculados
  - Envia email via Resend com template HTML contendo os detalhes da atividade e um link direto para o sistema
- O email e enviado apenas quando o responsavel for diferente do usuario que esta criando/editando

### 4. Link direto para a atividade
- O email contera um link para a pagina de atividades do CRM (URL publicada do projeto)
- Como nao existe uma pagina de detalhe individual de atividade, o link levara para `/activities` com o contexto necessario

## Detalhes tecnicos

### ActivityFormSheet.tsx
- Adicionar `assigned_to` ao schema zod: `z.string().uuid()`
- Importar e usar `useTeamMembers` para popular o Select
- Adicionar campo "Responsavel" no formulario, antes da secao "Vincular a"
- No defaultValues, usar `user?.id` como valor padrao
- No reset do form para edicao, usar `activity.assigned_to || user?.id`
- Na mutation, usar `data.assigned_to` no payload
- Apos criar/editar com sucesso, se `assigned_to !== user?.id`, chamar a edge function de notificacao

### Nova Edge Function: `supabase/functions/notify-activity-assignment/index.ts`
- Recebe: `activityTitle`, `activityType`, `dueDate`, `dueTime`, `assignedToUserId`, `assignerName`, `dealName`, `personName`, `organizationName`
- Busca email do usuario atribuido via `supabase.auth.admin.getUserById`
- Busca nome do usuario via tabela `profiles`
- Envia email via Resend com template HTML estilizado contendo:
  - Nome do remetente (quem atribuiu)
  - Tipo e titulo da atividade
  - Data e horario
  - Negocio, pessoa e organizacao vinculados (se houver)
  - Botao "Ver Atividade" com link para a aplicacao
- Usa RESEND_API_KEY (ja configurada)

### Template do email
- Design limpo similar ao email de mencoes ja existente
- Informacoes da atividade em card destacado
- Botao de acao com link para `/activities`
