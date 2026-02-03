
# Correção: Duplicação do Painel Lateral na Página de Relatórios

## Diagnóstico

O problema ocorre porque o componente `AppLayout` está sendo renderizado **duas vezes**:

1. **No `ProtectedRoute`** (linha 26): `return <AppLayout>{children}</AppLayout>;`
2. **Dentro do próprio `Reports.tsx`** (linha 41): `return <AppLayout>...</AppLayout>;`

### Estrutura Atual (Incorreta)

```text
ProtectedRoute
└── AppLayout (1º)
    └── Reports
        └── AppLayout (2º)  ← DUPLICADO!
            └── Conteúdo
```

### Comparação com Outras Páginas

| Página | Usa AppLayout interno? | Resultado |
|--------|------------------------|-----------|
| Dashboard | Não | OK |
| Organizations | Não | OK |
| Reports | Sim | DUPLICADO |

O `Dashboard.tsx` e `Organizations.tsx` **não envolvem** seu conteúdo em `AppLayout` porque o `ProtectedRoute` já faz isso automaticamente.

## Solução

Remover o `AppLayout` de dentro de `Reports.tsx`, deixando apenas o conteúdo da página, igual às outras páginas do sistema.

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Reports.tsx` | Remover wrapper `<AppLayout>` |

## Código Atual vs Corrigido

```tsx
// ANTES (Reports.tsx - linha 40-94)
return (
  <AppLayout>  // ← REMOVER
    <div className="flex flex-col gap-6 p-4 md:p-6">
      ...
    </div>
  </AppLayout>  // ← REMOVER
);

// DEPOIS
return (
  <div className="flex flex-col gap-6 p-4 md:p-6">
    ...
  </div>
);
```

## Resultado Esperado

```text
ProtectedRoute
└── AppLayout (único)
    └── Reports
        └── Conteúdo (sem duplicação)
```

Após a correção, a página de Relatórios terá apenas uma sidebar, assim como todas as outras páginas do sistema.
