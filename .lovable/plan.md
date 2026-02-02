
# Plano: Painel de Administração de Vendedores

## Situação Atual

### O que já existe:
- **Página de Login/Cadastro** (`/auth`): Funcional com abas para Entrar e Cadastrar
- **Sistema de Roles**: Tabela `user_roles` com enum `app_role` (admin, corretor)
- **Perfis**: Tabela `profiles` com dados dos usuários
- **Trigger automático**: `handle_new_user` cria perfil e atribui role "corretor" por padrão (primeiro usuário vira admin)

### Usuário atual:
| Nome | Role | Email |
|------|------|-------|
| ADRIANO JACOMETO | admin | (logado) |

## O que será criado

### 1. Página de Administração de Vendedores (`/admin/vendedores`)

```text
┌─────────────────────────────────────────────────────────────────┐
│ 👥 Gestão de Vendedores                                        │
│ Gerencie a equipe de corretores do sistema                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [+ Convidar Vendedor]                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ Vendedores Cadastrados                                      │
│  ├─────────────────────────────────────────────────────────────┤
│  │ Avatar │ Nome              │ Email         │ Role   │ Ação  │
│  │────────┼───────────────────┼───────────────┼────────┼───────│
│  │ [AJ]   │ ADRIANO JACOMETO  │ adriano@...   │ Admin  │ ⚙️    │
│  │ [LS]   │ Leonardo Sanches  │ leo@...       │ Corretor│ ⚙️   │
│  │ [BF]   │ Bárbara Francisconi│ barbara@...  │ Corretor│ ⚙️   │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ ℹ️ Como funciona                                            │
│  │                                                             │
│  │ • Vendedores podem se cadastrar em /auth                   │
│  │ • Novos cadastros recebem automaticamente role "Corretor"  │
│  │ • Aqui você pode promover para Admin ou remover acesso     │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Funcionalidades do Painel Admin

| Funcionalidade | Descrição |
|----------------|-----------|
| **Listar vendedores** | Ver todos os usuários com seus roles |
| **Alterar role** | Promover corretor para admin ou rebaixar |
| **Editar perfil** | Alterar nome e telefone do vendedor |
| **Remover acesso** | Desativar conta de um vendedor |
| **Estatísticas** | Cards com total de admins e corretores |

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────┐
│                   /admin/vendedores                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VendedoresAdmin.tsx (Página - Admin Only)                      │
│  ├── Header com título e estatísticas                           │
│  ├── StatsCards (total admins, corretores)                      │
│  ├── VendedoresTable.tsx                                        │
│  │   ├── Avatar + Nome                                          │
│  │   ├── Email                                                  │
│  │   ├── Role (Select para alterar)                             │
│  │   ├── Telefone                                               │
│  │   ├── Data de cadastro                                       │
│  │   └── Ações (editar, remover)                                │
│  └── VendedorFormSheet.tsx (editar perfil)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. VendedoresAdmin.tsx (Página)
- Acesso restrito a admins
- Lista todos os usuários do sistema
- Cards com estatísticas

### 2. VendedoresTable.tsx
- Tabela com todos os vendedores
- Select inline para alterar role
- Botões de ação

### 3. VendedorFormSheet.tsx
- Editar nome e telefone
- Ver email (read-only)
- Ver role atual

## Hooks

### useVendedores.ts

```typescript
export function useVendedores() {
  return useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      // Buscar profiles com roles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          phone,
          avatar_url,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Buscar roles separadamente
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Combinar dados
      return data.map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.user_id)?.role || 'corretor'
      }));
    }
  });
}

export function useUpdateVendedorRole() {
  return useMutation({
    mutationFn: async ({ userId, role }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (error) throw error;
    }
  });
}
```

## Segurança

As policies RLS existentes já protegem adequadamente:

| Tabela | SELECT | UPDATE | DELETE |
|--------|--------|--------|--------|
| profiles | ✅ Todos | ✅ Próprio | ❌ |
| user_roles | ✅ Todos | ✅ Admin only | ✅ Admin only |

**Importante**: A alteração de roles só pode ser feita por admins (já configurado no banco).

## Navegação

### Sidebar Update
Adicionar link "Vendedores" visível apenas para admins, abaixo de "Timelines.ai":

```text
📊 Dashboard
🏢 Organizações
👥 Pessoas
🤝 Negócios
📋 Atividades
📈 Relatórios
────────────
💬 Timelines.ai (admin only)
👤 Vendedores (admin only) ← NOVO
```

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/VendedoresAdmin.tsx` | Página de administração |
| `src/components/vendedores/VendedoresTable.tsx` | Tabela de vendedores |
| `src/components/vendedores/VendedorFormSheet.tsx` | Form de edição |
| `src/hooks/useVendedores.ts` | Hooks para CRUD |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/admin/vendedores` |
| `src/components/layout/AppSidebar.tsx` | Adicionar link "Vendedores" (admin only) |

## Fluxo de Uso

```text
                    Vendedor
                        │
                        ▼
            Acessa /auth → Cadastrar
                        │
                        ▼
        Preenche nome, email, senha
                        │
                        ▼
    Trigger cria profile + role "corretor"
                        │
                        ▼
          Vendedor acessa o sistema
                        
                        
                    Admin
                        │
                        ▼
        Acessa /admin/vendedores
                        │
                        ├── Vê lista de todos os vendedores
                        ├── Pode alterar role (corretor ↔ admin)
                        ├── Pode editar nome/telefone
                        └── Pode remover acesso
```

## Resultado Esperado

1. **Vendedores** podem se cadastrar normalmente em `/auth`
2. **Admins** têm controle total sobre a equipe em `/admin/vendedores`
3. Alterações de role são imediatas e seguras
4. Interface consistente com o resto do sistema
