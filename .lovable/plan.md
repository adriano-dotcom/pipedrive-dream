
# Plano: Corrigir Ordenação Server-Side na Tabela de Organizações

## Problema Identificado

A ordenação na tabela de organizações **não funciona corretamente** porque:

1. A paginação é **server-side** (`manualPagination: true`)
2. A ordenação no servidor está **fixada** como `created_at DESC`
3. O TanStack Table aplica ordenação **apenas nos dados da página atual** (25 registros)
4. Os dados com maiores/menores valores podem estar em outras páginas

**Exemplo:** Se o usuário clicar em "Automotores" para ordenar de maior para menor, o sistema só reordena os 25 registros atuais, não busca os registros com mais automotores de toda a base.

---

## Solução Proposta

Implementar **ordenação server-side** sincronizada com a interface.

---

## Alterações Necessárias

### 1. Hook `usePaginatedQuery.ts` - Adicionar Suporte a Ordenação

Adicionar parâmetro de ordenação na interface e passá-lo para a queryFn:

```typescript
interface SortingState {
  id: string;
  desc: boolean;
}

interface UsePaginatedQueryOptions<T> {
  // ... existentes
  sorting?: SortingState[];
}

// Passar sorting para queryFn
queryFn: (range: { from: number; to: number; sorting?: SortingState[] }) => Promise<...>
```

### 2. Tabela `OrganizationsTable.tsx` - Expor Estado de Ordenação

Adicionar callback para notificar a página pai quando a ordenação mudar:

```typescript
interface OrganizationsTableProps {
  // ... existentes
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState[]) => void;
}
```

Configurar TanStack Table para usar ordenação manual:
```typescript
useReactTable({
  // ...
  manualSorting: true, // Ordenação será feita pelo servidor
  onSortingChange: (updater) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(newSorting);
    onSortingChange?.(newSorting);
  },
});
```

### 3. Página `Organizations.tsx` - Ordenação Dinâmica no Servidor

Adicionar estado de ordenação e passar para a query:

```typescript
const [sorting, setSorting] = useState<SortingState[]>([]);

// Na função fetchOrganizations:
const fetchOrganizations = async ({ from, to }: { from: number; to: number }) => {
  let query = supabase.from('organizations').select(...);
  
  // Ordenação dinâmica baseada na coluna selecionada
  if (sorting.length > 0) {
    const { id: column, desc } = sorting[0];
    
    // Mapear IDs de colunas para campos do banco
    const columnMap: Record<string, string> = {
      name: 'name',
      cnpj: 'cnpj',
      automotores: 'automotores',
      label: 'label',
      city: 'address_city',
      // contact_name, contact_phone, contact_email são de relacionamento
    };
    
    const dbColumn = columnMap[column];
    if (dbColumn) {
      query = query.order(dbColumn, { ascending: !desc, nullsFirst: false });
    }
  } else {
    // Default: ordenar por data de criação
    query = query.order('created_at', { ascending: false });
  }
  
  // ... resto dos filtros e paginação
};
```

Passar sorting para a queryKey para invalidar cache:
```typescript
usePaginatedQuery({
  queryKey: ['organizations', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(sorting)],
  // ...
});
```

---

## Mapeamento de Colunas

| Coluna na Tabela | Campo no Banco | Ordenável Server-Side |
|------------------|----------------|----------------------|
| Nome | `name` | Sim |
| CNPJ | `cnpj` | Sim |
| Automotores | `automotores` | Sim |
| Status | `label` | Sim |
| Cidade | `address_city` | Sim |
| Contato Principal | `primary_contact.name` | Não (relacionamento) |
| Telefone | `primary_contact.phone` | Não (relacionamento) |
| Email | `primary_contact.email` | Não (relacionamento) |

Para colunas de relacionamento (contato), a ordenação permanecerá client-side na página atual.

---

## Fluxo de Funcionamento

```
Usuário clica em "Automotores" ↓
         │
         ▼
OrganizationsTable atualiza estado de sorting
         │
         ▼
Notifica Organizations.tsx via onSortingChange
         │
         ▼
queryKey muda, invalida cache
         │
         ▼
fetchOrganizations é chamado novamente
         │
         ▼
Query ao banco inclui: .order('automotores', { ascending: false })
         │
         ▼
Servidor retorna dados já ordenados
         │
         ▼
Tabela exibe dados corretamente ordenados
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/usePaginatedQuery.ts` | Adicionar suporte a parâmetro de ordenação |
| `src/components/organizations/OrganizationsTable.tsx` | Adicionar `manualSorting: true` e callback `onSortingChange` |
| `src/pages/Organizations.tsx` | Gerenciar estado de ordenação e aplicar na query |

---

## Benefícios

1. Ordenação correta em toda a base de dados
2. Usuário verá os registros com maiores/menores valores nas primeiras páginas
3. Consistência entre paginação e ordenação
4. Persistência opcional do estado de ordenação no localStorage
