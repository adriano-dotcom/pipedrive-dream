
# Plano: Corrigir Ordenação Server-Side na Tabela de Organizações

## Problema Identificado

A ordenação server-side foi implementada mas **não está funcionando**. Analisando o código e as network requests, identifiquei que:

1. Todas as queries ao banco usam `order=created_at.desc` (ordenação padrão)
2. Quando o usuário clica em uma coluna para ordenar, a nova ordenação **não é aplicada na query**

---

## Causa Raiz

O problema está na **sincronização entre o estado de ordenação e o React Query**. Especificamente:

1. A função `fetchOrganizations` é criada com `useCallback` e captura `sorting` em seu closure
2. Quando `sorting` muda, o `useCallback` recria a função (dependência correta)
3. A `queryKey` inclui `JSON.stringify(sorting)`, então muda quando sorting muda
4. **MAS** o React Query está fazendo cache hit da função antiga ao invés de usar a nova

O problema específico está no `usePaginatedQuery` hook que usa uma **queryKey composta** que inclui os parâmetros de paginação:

```typescript
// usePaginatedQuery.ts linha 80
queryKey: [...queryKey, 'paginated', pagination.pageIndex, pagination.pageSize],
```

Quando a ordenação muda, a `queryKey` base muda, mas como os parâmetros de paginação permanecem os mesmos, o React Query pode estar usando dados do cache incorretamente.

---

## Solução

### Correção 1: Resetar página quando ordenação mudar

No `Organizations.tsx`, quando a ordenação mudar, devemos voltar para a página 0:

```typescript
// Adicionar useEffect para resetar página quando sorting mudar
useEffect(() => {
  goToPage(0); // Voltar para primeira página ao mudar ordenação
}, [sorting]);
```

**Problema**: `goToPage` vem do hook `usePaginatedQuery` que é definido depois deste useEffect.

### Correção 2 (Melhor): Passar sorting como resetador de página no hook

Modificar `usePaginatedQuery` para aceitar um parâmetro `resetKeys` que quando mudar, reseta para página 0:

```typescript
// usePaginatedQuery.ts
interface UsePaginatedQueryOptions<T> {
  // ...existing
  resetOnChange?: unknown[]; // Quando esses valores mudarem, resetar para página 0
}

// No hook:
const resetHash = JSON.stringify(resetOnChange || []);
useEffect(() => {
  setPagination(prev => ({ ...prev, pageIndex: 0 }));
}, [resetHash]);
```

### Correção 3 (Mais simples): Mover goToPage(0) para o callback onSortingChange

No `Organizations.tsx`, modificar como passamos o `setSorting`:

```typescript
// Ao invés de passar setSorting diretamente:
onSortingChange={setSorting}

// Passar uma função que também reseta a página:
onSortingChange={(newSorting) => {
  setSorting(newSorting);
  goToPage(0);
}}
```

**Problema**: Isso cria dependência circular porque `goToPage` vem do mesmo hook que depende de `sorting`.

### Correção 4 (Correta): Incluir sorting no estado de paginação

A solução mais robusta é garantir que quando `sorting` mudar, a página seja resetada automaticamente:

**Arquivo: `src/pages/Organizations.tsx`**

Adicionar um `useEffect` que monitora mudanças em `sorting` e chama `goToPage(0)`:

```typescript
// Reset para página 0 quando a ordenação mudar
const sortingKey = JSON.stringify(sorting);
useEffect(() => {
  if (sorting.length > 0) {
    goToPage(0);
  }
}, [sortingKey, goToPage]);
```

**Mas espere** - o problema pode ser outro. Vou verificar se o callback `onSortingChange` está sendo realmente chamado.

---

## Diagnóstico Adicional Necessário

Preciso verificar se:
1. O botão de ordenação no header da tabela está realmente chamando `column.toggleSorting()`
2. O `handleSortingChange` está sendo executado
3. A mudança de `sorting` está invalidando a query corretamente

Analisando o código do `SortableHeader`:

```typescript
function SortableHeader({ column, title }: { column: Column<OrganizationWithContact>; title: string }) {
  const sorted = column.getIsSorted();
  
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      // ...
    >
```

Isso está correto. O `toggleSorting` deveria chamar `onSortingChange` do TanStack Table.

---

## Problema Real Encontrado

Depois de análise detalhada, o problema está no **tipo de dados**: O `SortableHeader` usa `column.toggleSorting()` que internamente dispara `onSortingChange`. Mas a função `handleSortingChange` recebe um `Updater<SortingState>` que pode ser uma função ou valor direto.

O código atual:
```typescript
const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
  const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
```

Está correto, mas o tipo no TanStack Table é `OnChangeFn<SortingState>` que recebe `Updater<SortingState>`.

O problema real pode ser que **a query não está sendo refetched** porque o React Query está usando cache.

---

## Correção Final

A correção deve abordar dois pontos:

### 1. Garantir que o reset de página aconteça

**Arquivo: `src/pages/Organizations.tsx`**

```typescript
// Wrapper para setSorting que também reseta a página
const handleSortingChange = useCallback((newSorting: SortingState) => {
  setSorting(newSorting);
  // goToPage será chamado pelo useEffect abaixo
}, []);

// Reset pagination when sorting changes
useEffect(() => {
  if (sorting.length > 0) {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }
}, [JSON.stringify(sorting)]);
```

**Problema**: `setPagination` não é exposto pelo hook `usePaginatedQuery`.

### 2. Expor setPagination no hook ou adicionar lógica de reset

**Arquivo: `src/hooks/usePaginatedQuery.ts`**

Adicionar lógica para resetar página quando queryKey base mudar:

```typescript
// Detectar mudança na queryKey base (excluindo paginação)
const baseQueryKeyHash = JSON.stringify(queryKey);
const prevBaseQueryKeyHash = useRef(baseQueryKeyHash);

useEffect(() => {
  if (prevBaseQueryKeyHash.current !== baseQueryKeyHash) {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    prevBaseQueryKeyHash.current = baseQueryKeyHash;
  }
}, [baseQueryKeyHash]);
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/usePaginatedQuery.ts` | Adicionar reset automático de página quando queryKey base mudar |
| `src/pages/Organizations.tsx` | Garantir que callback de sorting use tipo correto |

---

## Código das Correções

### Arquivo: `src/hooks/usePaginatedQuery.ts`

Adicionar após a declaração de `pagination`:

```typescript
// Reset to page 0 when base queryKey changes (e.g., sorting, filters)
const baseQueryKeyHash = JSON.stringify(queryKey);
const prevBaseQueryKeyRef = useRef(baseQueryKeyHash);

useEffect(() => {
  if (prevBaseQueryKeyRef.current !== baseQueryKeyHash) {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    prevBaseQueryKeyRef.current = baseQueryKeyHash;
  }
}, [baseQueryKeyHash]);
```

Adicionar import de `useRef`:
```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
```

### Arquivo: `src/pages/Organizations.tsx`

Verificar se o callback está correto:
```typescript
<OrganizationsTable
  // ...
  sorting={sorting}
  onSortingChange={setSorting}  // Isso deve funcionar com a correção acima
/>
```

---

## Resultado Esperado

1. Usuário clica na coluna "Automotores" para ordenar
2. `OrganizationsTable` dispara `onSortingChange([{ id: 'automotores', desc: true }])`
3. `Organizations.tsx` atualiza `sorting` via `setSorting`
4. A `queryKey` muda para incluir a nova ordenação
5. `usePaginatedQuery` detecta mudança na queryKey base e reseta para página 0
6. React Query faz nova requisição com a função `fetchOrganizations` atualizada
7. A query inclui `.order('automotores', { ascending: false })`
8. Dados retornam ordenados do servidor
