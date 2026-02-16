

# Registrar E-mails de Campanha na Timeline do Contato

## Problema Atual
Quando um e-mail e enviado via campanha em massa, o unico registro fica na tabela `bulk_email_recipients`. O contato nao tem nenhuma evidencia na sua timeline ou aba de e-mails de que recebeu aquele e-mail.

## Solucao
Apos cada envio bem-sucedido na Edge Function `process-bulk-email`, inserir:

1. **Um registro em `sent_emails`** - para aparecer na aba "E-mails" do contato
2. **Um registro em `people_history`** - para aparecer na timeline do contato

## Alteracoes

### Arquivo: `supabase/functions/process-bulk-email/index.ts`

Dentro do bloco de sucesso (apos `resend.emails.send` retornar sem erro, linha 161-166), adicionar duas insercoes:

**1. Inserir em `sent_emails`:**
```typescript
await supabase.from("sent_emails").insert({
  entity_type: "person",
  entity_id: recipient.person_id,
  from_email: fromEmail,
  from_name: fromName,
  to_email: recipient.email,
  to_name: recipient.name,
  subject: personalizedSubject,
  body: personalizedBody,
  status: "sent",
  sent_at: new Date().toISOString(),
  created_by: userId,
});
```

**2. Inserir em `people_history`:**
```typescript
await supabase.from("people_history").insert({
  person_id: recipient.person_id,
  event_type: "email_sent",
  description: `E-mail enviado via campanha: "${personalizedSubject}"`,
  created_by: userId,
});
```

Ambas as insercoes so ocorrem se `recipient.person_id` existir (contatos vinculados). E-mails para destinatarios sem `person_id` continuam funcionando normalmente, apenas sem o registro na timeline.

### Arquivo: `src/components/people/detail/PersonTimeline.tsx`

Adicionar suporte ao novo tipo de evento `email_sent` nos mapeamentos de icone e cor:
- Icone: `Mail`
- Cor: `bg-pink-500/20 text-pink-400`

## Secao Tecnica

### Arquivos modificados:
```text
supabase/functions/process-bulk-email/index.ts  -> Inserir registros apos envio
src/components/people/detail/PersonTimeline.tsx  -> Suporte visual ao evento email_sent
```

### Nenhuma migracao SQL necessaria
As tabelas `sent_emails` e `people_history` ja existem com as colunas necessarias. As politicas RLS permitem insercao pelo service role (usado na Edge Function).

### Impacto em performance
Cada e-mail enviado gerara 2 insercoes extras no banco. Com o rate limit padrao de 10 e-mails por lote, isso adiciona ~20 insercoes por execucao, impacto negligivel.

