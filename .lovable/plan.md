
# Implementacao de Paginacao Server-Side (Cursor-Based)

## Analise do Estado Atual

### Problemas Identificados

| Componente | Problema | Impacto |
|------------|----------|---------|
| `People.tsx` | Carrega TODOS os registros de uma vez | 984 pessoas carregadas na memoria |
| `Organizations.tsx` | Carrega TODOS os registros de uma vez | 841 organizacoes carregadas na memoria |
| `Deals.tsx` | Carrega TODOS os registros de uma vez | Problema menor (apenas 2 deals atualmente) |
| `DealsListView.tsx` | Carrega TODOS os deals do pipeline | Mesma logica |

### Arquitetura Atual

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PAGINACAO CLIENT-SIDE (ATUAL)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Supabase ──(todos registros)──> React Query ──> Memoria       │
│                                                                  │
│   1. Busca SELECT * FROM people (984 rows)                       │
│   2. Carrega tudo na memoria do navegador                        │
│   3. TanStack Table faz paginacao no frontend                    │
│   4. Filtragem tambem acontece client-side                       │
│                                                                  │
│   Problemas:                                                     │
│   • Tempo de carregamento inicial alto                           │
│   • Uso excessivo de memoria                                     │
│   • Limite de 1000 rows do Supabase (nao escalavel)             │
│   • Travamentos com 20K+ registros                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### O que ja funciona

- TanStack Table configurado com `getPaginationRowModel()`
- UI de paginacao implementada (botoes, seletor de page size)
- Persistencia de `pageSize` no localStorage

---

## Solucao Proposta: Paginacao Server-Side

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PAGINACAO SERVER-SIDE (PROPOSTA)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Browser                  Supabase                              │
│      │                        │                                  │
│      │──(page=0, size=25)────>│                                 │
│      │<──(25 rows + count)────│                                 │
│      │                        │                                  │
│      │──(page=1, size=25)────>│                                 │
│      │<──(25 rows + count)────│                                 │
│                                                                  │
│   Beneficios:                                                    │
│   • Carrega apenas dados visiveis                                │
│   • Suporta milhoes de registros                                 │
│   • Filtragem server-side (eficiente)                           │
│   • Menor uso de memoria                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar/Modificar

### 1. Hook Generico de Paginacao

Criar `src/hooks/usePaginatedQuery.ts`:

```typescript
interface PaginatedQueryOptions<T> {
  queryKey: string[];
  tableName: string;
  selectColumns: string;
  orderBy: { column: string; ascending: boolean };
  filters?: QueryFilter[];
  searchColumn?: string;
  searchValue?: string;
  pageSize?: number;
}

interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  pageCount: number;
  currentPage: number;
  isLoading: boolean;
  isFetching: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}
```

Este hook encapsula:
- Query com `.range(start, end)` do Supabase
- Contagem total com `{ count: 'exact', head: true }`
- Estado de paginacao
- Cache inteligente por pagina

### 2. Modificar Pagina People.tsx

**Antes:**
```typescript
const { data: people, isLoading } = useQuery({
  queryKey: ['people', search],
  queryFn: async () => {
    let query = supabase
      .from('people')
      .select('*, organizations:...')
      .order('created_at', { ascending: false });
    // Retorna TODOS os registros
    const { data, error } = await query;
    return data;
  },
});
```

**Depois:**
```typescript
const {
  data: people,
  totalCount,
  currentPage,
  pageCount,
  isLoading,
  goToPage,
  nextPage,
  previousPage,
  setPageSize,
} = usePaginatedQuery({
  queryKey: ['people'],
  tableName: 'people',
  selectColumns: '*, organizations:...',
  orderBy: { column: 'created_at', ascending: false },
  searchColumn: 'name,email,phone',
  searchValue: search,
  filters: buildFiltersFromState(advancedFilters),
  pageSize: 25,
});
```

### 3. Modificar PeopleTable.tsx

Remover paginacao client-side do TanStack Table:

**Antes:**
```typescript
const table = useReactTable({
  data: people,
  getPaginationRowModel: getPaginationRowModel(), // Client-side
});
```

**Depois:**
```typescript
const table = useReactTable({
  data: people,
  manualPagination: true, // Server-side
  pageCount: pageCount,   // Vem do hook
});
```

### 4. Filtros Server-Side

Mover filtragem do frontend para queries do Supabase:

```typescript
// Construir query com filtros server-side
function buildQuery(filters: FiltersState) {
  let query = supabase.from('people').select('...');
  
  if (filters.labels.length > 0) {
    query = query.in('label', filters.labels);
  }
  
  if (filters.hasEmail === true) {
    query = query.not('email', 'is', null);
  }
  
  if (filters.dateRange.from) {
    query = query.gte('created_at', filters.dateRange.from.toISOString());
  }
  
  return query;
}
```

---

## Arquivos a Modificar

| Arquivo | Acao | Complexidade |
|---------|------|--------------|
| `src/hooks/usePaginatedQuery.ts` | CRIAR | Media |
| `src/pages/People.tsx` | Substituir useQuery por hook paginado | Media |
| `src/pages/Organizations.tsx` | Substituir useQuery por hook paginado | Media |
| `src/components/people/PeopleTable.tsx` | Usar paginacao manual | Baixa |
| `src/components/organizations/OrganizationsTable.tsx` | Usar paginacao manual | Baixa |
| `src/components/deals/DealsTable.tsx` | Usar paginacao manual | Baixa |
| `src/components/deals/DealsListView.tsx` | Usar paginacao manual | Baixa |

---

## Detalhes Tecnicos

### Estrutura do Hook usePaginatedQuery

```typescript
import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  queryFn: (range: { from: number; to: number }) => Promise<{ data: T[]; count: number }>;
  pageSize?: number;
  initialPage?: number;
}

export function usePaginatedQuery<T>(options: UsePaginatedQueryOptions<T>) {
  const [page, setPage] = useState(options.initialPage || 0);
  const [pageSize, setPageSize] = useState(options.pageSize || 25);
  
  const from = page * pageSize;
  const to = from + pageSize - 1;
  
  const query = useQuery({
    queryKey: [...options.queryKey, page, pageSize],
    queryFn: () => options.queryFn({ from, to }),
    placeholderData: keepPreviousData, // Mantem dados anteriores enquanto carrega
    staleTime: 30000,
  });
  
  const totalCount = query.data?.count || 0;
  const pageCount = Math.ceil(totalCount / pageSize);
  
  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(0, Math.min(newPage, pageCount - 1)));
  }, [pageCount]);
  
  return {
    data: query.data?.data || [],
    totalCount,
    pageCount,
    currentPage: page,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    goToPage,
    nextPage: () => goToPage(page + 1),
    previousPage: () => goToPage(page - 1),
    canNextPage: page < pageCount - 1,
    canPreviousPage: page > 0,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(0); // Reset para primeira pagina
    },
  };
}
```

### Query Supabase com Range

```typescript
// Busca paginada com contagem total
const fetchPeople = async ({ from, to }: { from: number; to: number }) => {
  // Query para dados
  const { data, error } = await supabase
    .from('people')
    .select('*, organizations:organizations!people_organization_id_fkey(...)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
    
  if (error) throw error;
  
  return { 
    data: data || [], 
    count: // count vem automaticamente quando usamos { count: 'exact' }
  };
};
```

### Filtro de Tags (Server-Side)

Para filtros por tags, usar subquery ou join:

```typescript
// Opcao 1: Buscar IDs primeiro, depois paginar
const taggedPersonIds = await supabase
  .from('person_tag_assignments')
  .select('person_id')
  .in('tag_id', selectedTagIds);

// Depois usar .in('id', taggedPersonIds) na query principal

// Opcao 2: Para performance, criar uma VIEW ou RPC no Supabase
```

---

## Plano de Execucao

### Fase 1: Criar Infraestrutura (Hook)
1. Criar `usePaginatedQuery.ts` com logica base
2. Testar isoladamente

### Fase 2: Migrar People
1. Modificar `People.tsx` para usar novo hook
2. Atualizar `PeopleTable.tsx` para paginacao manual
3. Mover filtros para server-side

### Fase 3: Migrar Organizations
1. Modificar `Organizations.tsx`
2. Atualizar `OrganizationsTable.tsx`

### Fase 4: Migrar Deals
1. Modificar `DealsListView.tsx`
2. Atualizar `DealsTable.tsx`

---

## Melhorias de UX

### Indicadores de Loading

```typescript
// Mostrar skeleton durante fetch, manter dados anteriores
{isFetching && !isLoading && (
  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />
)}
```

### Prefetch da Proxima Pagina

```typescript
// Carregar proxima pagina em background
queryClient.prefetchQuery({
  queryKey: ['people', page + 1, pageSize],
  queryFn: () => fetchPeople({ from: (page + 1) * pageSize, to: ... }),
});
```

---

## Metricas de Sucesso

| Metrica | Antes | Depois (esperado) |
|---------|-------|-------------------|
| Tempo inicial de carga | 3-5s (984 rows) | < 500ms (25 rows) |
| Memoria usada | ~50MB (grande dataset) | ~5MB (pagina atual) |
| Suporte a registros | 1000 (limite Supabase) | Ilimitado |
| Responsividade ao filtrar | Lenta (client-side) | Rapida (server-side) |
