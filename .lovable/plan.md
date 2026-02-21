

# Atualizar Template de E-mail de Menção

## O que será feito

Atualizar o e-mail enviado quando um usuário é mencionado (@) em uma nota para usar o mesmo modelo visual profissional já utilizado nas notificações de atribuição de atividades.

## Mudança

**Arquivo:** `supabase/functions/send-mention-notification/index.ts`

O template HTML atual do e-mail de menção é simples e básico. Será substituído pelo layout profissional com:

- Header com título e subtítulo estilizados
- Card com fundo cinza, borda arredondada e informações organizadas (tipo de entidade, nome, conteúdo da nota)
- Botão azul "Ver no CRM" com link direto para a entidade
- Footer com texto de notificação automática
- Mesma paleta de cores e tipografia do template de atividades

## Detalhes Técnicos

- Substituir o bloco HTML inline (linhas 142-155) pelo novo template estilizado baseado no modelo de `notify-activity-assignment`
- Gerar link direto para a entidade: `https://pipedrive-dream.lovable.app/deals/{id}`, `/people/{id}` ou `/organizations/{id}` conforme o `entityType`
- Manter o envio non-blocking com `try-catch` e `Promise.allSettled` já existente
- Reimplantar a Edge Function automaticamente

