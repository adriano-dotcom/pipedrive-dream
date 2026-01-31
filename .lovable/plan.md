

# Formatar CNPJ na Tabela de Pessoas

## Problema

Na tabela de Pessoas (`/people`), a coluna CNPJ da organização vinculada está exibindo o valor sem formatação (apenas dígitos como `04719759000260`), quando deveria estar no padrão brasileiro `XX.XXX.XXX/XXXX-XX` (exemplo: `04.719.759/0001-60`).

## Solução

Utilizar a função `formatCnpj` que já existe em `src/lib/utils.ts` para formatar a exibição do CNPJ na tabela.

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/people/PeopleTable.tsx` | Importar `formatCnpj` e aplicar na coluna CNPJ |

---

## Detalhes Técnicos

### PeopleTable.tsx

**Adicionar import:**

```typescript
import { formatCnpj } from '@/lib/utils';
```

**Modificar a célula da coluna CNPJ (linha 259-264):**

Antes:
```typescript
cell: ({ row }) => (
  row.original.organizations?.cnpj ? (
    <span className="text-muted-foreground font-mono text-xs">
      {row.original.organizations.cnpj}
    </span>
  ) : <span className="text-muted-foreground/50">-</span>
),
```

Depois:
```typescript
cell: ({ row }) => (
  row.original.organizations?.cnpj ? (
    <span className="text-muted-foreground font-mono text-xs">
      {formatCnpj(row.original.organizations.cnpj)}
    </span>
  ) : <span className="text-muted-foreground/50">-</span>
),
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| `04719759000260` | `04.719.759/0002-60` |
| `05629020000140` | `05.629.020/0001-40` |
| `21764817000106` | `21.764.817/0001-06` |

A formatação segue o padrão brasileiro para CNPJ, consistente com a exibição em outras partes do sistema (como a tabela de Organizações).

