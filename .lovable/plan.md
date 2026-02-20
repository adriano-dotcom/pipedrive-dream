

# Gestao de Vendedores: Inativar, Excluir e Restricao de Dominio

## O que sera feito

1. **Adicionar coluna `is_active` na tabela `profiles`** para marcar vendedores como ativos/inativos
2. **Criar Edge Function `delete-user`** para admins excluirem usuarios do auth (permitindo recadastro)
3. **Adicionar menu de acoes na tabela de vendedores** com opcoes: Editar, Inativar/Reativar, Excluir
4. **Restringir cadastro a emails @jacometo** (validacao no formulario de signup)
5. **Atualizar stats** com contagem de inativos

## Como vai funcionar

- Na tabela de vendedores, o botao de editar (lapiszinho) sera substituido por um menu dropdown (3 pontos) com:
  - **Editar** - abre o formulario existente
  - **Inativar / Reativar** - alterna status ativo/inativo
  - **Excluir** - remove acesso ao sistema, mantendo perfil como registro
- Vendedores inativos aparecem com opacidade reduzida + badge "Inativo"
- O admin nao pode agir sobre si mesmo
- No cadastro (`/auth`), apenas emails com dominio `@jacometo` serao aceitos (ex: `nome@jacometo.com.br` ou `nome@jacometo.com`)

## Etapas tecnicas

### 1. Migration SQL
```sql
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
```

### 2. Edge Function `delete-user`
Arquivo: `supabase/functions/delete-user/index.ts`
- Recebe `userIdToDelete` no body (POST)
- Valida que o chamador e admin via query em `user_roles`
- Impede auto-exclusao
- Chama `supabase.auth.admin.deleteUser()` com service role
- Marca o perfil como `is_active = false`

Adicionar ao `supabase/config.toml`:
```toml
[functions.delete-user]
verify_jwt = false
```

### 3. Hook `useVendedores.ts`
- Adicionar `is_active: boolean` ao tipo `Vendedor`
- Incluir `is_active` no select da query
- Novo hook `useToggleVendedorActive` - alterna `is_active`
- Novo hook `useDeleteVendedor` - chama edge function e invalida cache

### 4. Tabela `VendedoresTable.tsx`
- Substituir botao Pencil por `DropdownMenu` (icone MoreHorizontal) com 3 opcoes
- Adicionar coluna "Status" com badge verde (Ativo) ou vermelho (Inativo)
- Linhas de inativos com `opacity-50`
- `AlertDialog` de confirmacao para inativar e excluir
- Desabilitar acoes para o proprio admin

### 5. Pagina `VendedoresAdmin.tsx`
- Adicionar 4o card de stats: "Inativos" com icone `UserX`
- Grid de 4 colunas

### 6. Restricao de dominio no cadastro (`Auth.tsx`)
- Alterar validacao do `signupSchema` para aceitar apenas emails `@jacometo`
- Mensagem de erro: "Apenas emails @jacometo sao permitidos"

### Arquivos criados
- `supabase/functions/delete-user/index.ts`

### Arquivos modificados
- `supabase/config.toml`
- `src/hooks/useVendedores.ts`
- `src/components/vendedores/VendedoresTable.tsx`
- `src/pages/VendedoresAdmin.tsx`
- `src/pages/Auth.tsx`

### Seguranca
- Edge function valida role admin antes de executar
- Nao e possivel excluir/inativar a si mesmo
- Exclusao do auth preserva perfil como registro historico
- Cadastro restrito a dominio @jacometo

