

# Corrigir Erro de Mesclagem: Constraint de Email Unico

## Problema

Ao mesclar contatos, o sistema tenta atualizar o contato mantido com o email selecionado ANTES de excluir o contato duplicado. Como existe uma constraint `people_email_unique`, o banco rejeita a operacao porque dois registros ficariam com o mesmo email simultaneamente.

## Solucao

Reordenar as operacoes no `useMergeContacts.ts`: **limpar os campos unicos do contato que sera excluido ANTES de atualizar o contato mantido**.

## Mudanca Tecnica

### Arquivo: `src/hooks/useMergeContacts.ts`

Apos o backup (linha 109) e antes do update do kept record (linha 113), adicionar uma etapa para limpar email, CPF e pipedrive_id do contato que sera excluido:

```text
// ANTES do update do kept record:
// Limpar campos unicos do contato que sera excluido para evitar conflitos de constraint
await supabase
  .from('people')
  .update({ email: null, cpf: null, pipedrive_id: null })
  .eq('id', deletePersonId);

// DEPOIS: update do kept record com mergedData (ja funciona sem conflito)
```

Isso garante que nao haja duplicatas no momento do update, pois o contato a ser excluido ja tera seus campos unicos zerados.

### Nenhum outro arquivo precisa ser alterado

A logica de backup ja salva os dados originais do contato excluido, entao o undo continuara funcionando normalmente.

