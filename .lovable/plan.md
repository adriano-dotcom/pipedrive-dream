

# Formatação de CNPJ na Exibição

## Objetivo

Exibir o CNPJ sempre no padrão formatado `##.###.###/####-##` (exemplo: `07.701.990/0001-34`) em toda a aplicação, mesmo quando armazenado sem formatação no banco de dados.

---

## Situação Atual

O CNPJ está sendo armazenado como string numérica (ex: `16959586000156`) e exibido sem formatação nas tabelas e listas de organizações.

**Locais afetados:**
- `OrganizationsTable.tsx` - linha 204: exibe `row.original.cnpj || '-'`
- `OrganizationsMobileList.tsx` - linha 78: exibe `org.cnpj`

---

## Solução

### 1. Criar função utilitária de formatação

**Arquivo:** `src/lib/utils.ts`

Adicionar função `formatCnpj` que formata qualquer string de CNPJ (com ou sem formatação) para o padrão visual:

```typescript
export function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  
  // Remove caracteres não numéricos
  const digits = cnpj.replace(/\D/g, '');
  
  // Se não tem 14 dígitos, retorna como está
  if (digits.length !== 14) return cnpj;
  
  // Formata: ##.###.###/####-##
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}
```

### 2. Aplicar na tabela desktop

**Arquivo:** `OrganizationsTable.tsx`

Importar a função e usar na coluna CNPJ:

```tsx
import { formatCnpj } from '@/lib/utils';

// Na definição da coluna cnpj (linha 203-206):
cell: ({ row }) => (
  <span className="text-muted-foreground font-mono text-sm">
    {row.original.cnpj ? formatCnpj(row.original.cnpj) : '-'}
  </span>
),
```

### 3. Aplicar na lista mobile

**Arquivo:** `OrganizationsMobileList.tsx`

Importar a função e usar na exibição:

```tsx
import { formatCnpj } from '@/lib/utils';

// Na exibição do CNPJ (linhas 76-80):
{org.cnpj && (
  <div className="text-muted-foreground font-mono text-xs">
    CNPJ: {formatCnpj(org.cnpj)}
  </div>
)}
```

---

## Resumo de Arquivos

| Arquivo | Modificação |
|---------|-------------|
| `src/lib/utils.ts` | Adicionar função `formatCnpj` |
| `src/components/organizations/OrganizationsTable.tsx` | Importar e usar `formatCnpj` na coluna CNPJ |
| `src/components/organizations/OrganizationsMobileList.tsx` | Importar e usar `formatCnpj` na exibição |

---

## Resultado Visual

| Antes | Depois |
|-------|--------|
| 16959586000156 | 16.959.586/0001-56 |
| 07701990000134 | 07.701.990/0001-34 |

