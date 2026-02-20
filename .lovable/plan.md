

# Gestao de Vendedores: Inativar e Excluir

## O que sera feito

1. **Adicionar coluna `is_active` na tabela `profiles`** para marcar vendedores como ativos ou inativos (em vez de excluir permanentemente)
2. **Criar uma Edge Function `delete-user`** para que admins possam excluir usuarios do sistema de autenticacao (permite recadastro)
3. **Adicionar botoes na tabela de vendedores**: "Inativar" e "Excluir" com dialogo de confirmacao
4. **Vendedores inativos** continuam no sistema como registro, preservando negocios e historico, mas nao aparecem em selects de atribuicao
5. **Excluir** remove o usuario do sistema de autenticacao (permite recadastro), mas mantém o perfil como inativo

## Como vai funcionar para o usuario

- Na tabela de vendedores, cada linha tera um menu de acoes com:
  - **Editar** (ja existe)
  - **Inativar / Reativar** - marca o vendedor como inativo, exibe badge "Inativo" na tabela
  - **Excluir** - remove o acesso ao sistema, mantendo o perfil como registro historico
- Vendedores inativos aparecem na tabela com visual diferenciado (opacidade reduzida + badge "Inativo")
- Os negocios, atividades e historico do vendedor sao preservados
- O admin atual nao pode inativar/excluir a si mesmo

## Etapas

### 1. Migration SQL

Adicionar coluna `is_active` na tabela `profiles`:

```sql
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
```

### 2. Edge Function `delete-user`

Criar uma funcao de borda que use o `service_role` para chamar `supabase.auth.admin.deleteUser()`. Recebe o `user_id` e verifica se quem chama e admin.

### 3. Hook `useVendedores` - Atualizar

- Adicionar `is_active` ao tipo `Vendedor` e a query
- Criar mutation `useToggleVendedorActive` para ativar/inativar
- Criar mutation `useDeleteVendedor` que chama a edge function e marca o perfil como inativo

### 4. Tabela de Vendedores - Atualizar

- Adicionar coluna "Status" com badge Ativo/Inativo
- Adicionar dropdown de acoes (3 pontos) com opcoes: Editar, Inativar/Reativar, Excluir
- Dialogo de confirmacao para inativar e excluir
- Visual diferenciado para inativos (opacidade)

### 5. Stats Cards - Atualizar

- Adicionar card "Inativos" ou atualizar contagens para separar ativos de inativos

## Secao Tecnica

### Arquivos modificados
- 1 migration SQL (adicionar `is_active` em `profiles`)
- 1 nova edge function: `supabase/functions/delete-user/index.ts`
- `src/hooks/useVendedores.ts` - adicionar campo, mutations
- `src/components/vendedores/VendedoresTable.tsx` - dropdown de acoes, badges
- `src/pages/VendedoresAdmin.tsx` - atualizar stats

### Seguranca
- A edge function `delete-user` valida que o chamador e admin via `has_role()` antes de executar
- Nao e possível excluir/inativar a si mesmo
- A exclusao do auth nao apaga o perfil, apenas remove o acesso

### Sobre excluir usuarios existentes para testes
- Sera possivel usar o botao "Excluir" na interface para remover os 2 corretores (Leonardo e Adriana)
- Apos excluidos, eles podem se recadastrar em `/auth`
- O admin ADRIANO JACOMETO nao sera afetado

