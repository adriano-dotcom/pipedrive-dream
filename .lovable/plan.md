

# Correção: Links de Navegação Não Funcionam nas Tabelas

## Problema Identificado

Ao clicar nos nomes de organizações ou pessoas na tabela, a navegação para a página de detalhes não funciona. O erro técnico identificado é "Node is detached from document", indicando que os elementos do DOM estão sendo removidos/recriados constantemente antes do clique ser processado.

## Causa Raiz

A `queryKey` do hook `usePaginatedQuery` inclui valores que estão causando re-renderizações excessivas:

**Código problemático em `People.tsx` (linha 211):**
```typescript
queryKey: ['people', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(selectedTagIds), JSON.stringify(taggedPersonIds)],
                                                                                                           ⬆️ PROBLEMA
```

**Código problemático em `Organizations.tsx` (linha 277):**
```typescript
queryKey: ['organizations', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(selectedTagIds), JSON.stringify(taggedOrgIds)],
                                                                                                                ⬆️ PROBLEMA
```

### Por que isso causa o problema:

```text
Fluxo problemático:
┌──────────────────────────────────────────────────────────────────┐
│  1. Componente monta → taggedOrgIds = []                         │
│  2. Query de tags executa em background                           │
│  3. Tags retornam → taggedOrgIds = ['id1', 'id2']                │
│  4. queryKey muda (porque taggedOrgIds mudou)                     │
│  5. usePaginatedQuery recarrega com nova queryKey                 │
│  6. Tabela é re-renderizada completamente                         │
│  7. Links antigos são desmontados do DOM                          │
│  8. Usuário tenta clicar → "Node is detached from document"      │
└──────────────────────────────────────────────────────────────────┘
```

O `taggedOrgIds` e `taggedPersonIds` são valores **derivados** de `selectedTagIds` - não deveriam estar na queryKey porque:

1. Já estão implícitos via `selectedTagIds`
2. São usados **dentro** da `queryFn`, não para identificar a query
3. Quando mudam, causam invalidação desnecessária

---

## Solução

Remover `taggedOrgIds` e `taggedPersonIds` da queryKey e ajustar a lógica para aguardar a query de tags quando necessário.

### Alterações em `src/pages/People.tsx`

**Antes (linha 211):**
```typescript
queryKey: ['people', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(selectedTagIds), JSON.stringify(taggedPersonIds)],
```

**Depois:**
```typescript
queryKey: ['people', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(selectedTagIds)],
```

Também adicionar condição `enabled` para aguardar a query de tags quando houver tags selecionadas:

```typescript
const isTagQueryReady = selectedTagIds.length === 0 || taggedPersonIds !== undefined;

// Use paginated query hook
const {
  // ...
} = usePaginatedQuery<PersonWithOrg>({
  queryKey: ['people', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(selectedTagIds)],
  queryFn: fetchPeople,
  pageSizeStorageKey: PAGE_SIZE_KEY,
  pageSize: 25,
  enabled: isTagQueryReady, // Aguarda tags serem carregadas
});
```

### Alterações em `src/pages/Organizations.tsx`

**Antes (linha 277):**
```typescript
queryKey: ['organizations', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(selectedTagIds), JSON.stringify(taggedOrgIds)],
```

**Depois:**
```typescript
queryKey: ['organizations', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(selectedTagIds)],
```

Com a mesma lógica de `enabled`:

```typescript
const isTagQueryReady = selectedTagIds.length === 0 || taggedOrgIds !== undefined;

// Use paginated query hook
const {
  // ...
} = usePaginatedQuery<OrganizationWithContact>({
  queryKey: ['organizations', debouncedSearch, JSON.stringify(advancedFilters), JSON.stringify(selectedTagIds)],
  queryFn: fetchOrganizations,
  pageSizeStorageKey: PAGE_SIZE_KEY,
  pageSize: 25,
  enabled: isTagQueryReady,
});
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/People.tsx` | Remover `taggedPersonIds` da queryKey, adicionar lógica `enabled` |
| `src/pages/Organizations.tsx` | Remover `taggedOrgIds` da queryKey, adicionar lógica `enabled` |

---

## Por que isso resolve

```text
Fluxo corrigido:
┌──────────────────────────────────────────────────────────────────┐
│  1. Componente monta                                              │
│  2. Se selectedTagIds > 0, enabled=false                         │
│  3. Query de tags executa e retorna                               │
│  4. enabled=true, query principal executa UMA vez                │
│  5. Tabela renderiza e permanece estável                          │
│  6. Links funcionam normalmente ✅                                │
└──────────────────────────────────────────────────────────────────┘
```

A queryKey agora depende apenas de valores que mudam por ação do usuário (busca, filtros, tags selecionadas), não de valores intermediários que mudam por si só.

