
# Plano: Corrigir Checkboxes de Seleção na Tabela de Organizações

## Problema Identificado

As caixas de seleção (checkboxes) não estão funcionando porque há um **loop de sincronização** entre o estado interno `rowSelection` e o estado externo `selectedIds`:

```
Usuário clica no checkbox
       │
       ▼
row.toggleSelected(true) atualiza rowSelection
       │
       ▼
Efeito 1: detecta mudança → chama onSelectionChange(selectedRowIds)
       │
       ▼
Pai: setSelectedIds(newIds)
       │
       ▼
Efeito 2: detecta mudança em selectedIds → setRowSelection(newSelection)
       │
       ▼
PROBLEMA: Se o array for considerado "diferente" (nova referência),
o rowSelection é sobrescrito, causando loop ou comportamento inesperado
```

O problema específico é que os dois efeitos estão competindo:
- Um efeito converte `rowSelection` → `selectedIds` (notifica o pai)
- Outro efeito converte `selectedIds` → `rowSelection` (sincroniza do pai)

Quando a tabela re-renderiza após a mudança de página/ordenação, os dados mudam e `selectedIds` é resetado, criando conflito.

---

## Solução

Modificar a lógica de sincronização para evitar o loop:

1. **Remover sincronização bidirecional** - usar apenas um sentido
2. **Comparar valores antes de atualizar** - evitar atualizações desnecessárias

---

## Correção Proposta

Modificar `OrganizationsTable.tsx` para:

1. Usar apenas `selectedIds` como fonte de verdade
2. Comparar arrays antes de chamar `onSelectionChange` para evitar chamadas desnecessárias
3. Evitar que o segundo useEffect sobrescreva seleções válidas

```typescript
// Sync row selection with parent callback - com proteção contra loop
useEffect(() => {
  const selectedRowIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
  // Comparar arrays para evitar chamadas desnecessárias
  const currentIds = selectedIds || [];
  const isSame = 
    selectedRowIds.length === currentIds.length && 
    selectedRowIds.every(id => currentIds.includes(id));
  
  if (!isSame) {
    onSelectionChange?.(selectedRowIds);
  }
}, [rowSelection]);  // Remover onSelectionChange e selectedIds das dependências

// Sync incoming selectedIds with local rowSelection state
// Apenas quando selectedIds muda externamente (ex: reset após ação bulk)
useEffect(() => {
  // Converter selectedIds para o formato esperado pelo TanStack Table
  const newSelection: RowSelectionState = {};
  (selectedIds || []).forEach(id => {
    newSelection[id] = true;
  });
  
  // Comparar para evitar loop infinito
  const currentKeys = Object.keys(rowSelection).filter(k => rowSelection[k]);
  const incomingKeys = selectedIds || [];
  const isSame = 
    currentKeys.length === incomingKeys.length && 
    currentKeys.every(id => incomingKeys.includes(id));
  
  if (!isSame) {
    setRowSelection(newSelection);
  }
}, [selectedIds]);  // Remover rowSelection das dependências
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/organizations/OrganizationsTable.tsx` | Corrigir useEffects de sincronização para evitar loop |

---

## Código da Correção

Substituir os dois useEffects (linhas 203-216) por:

```typescript
// Sync row selection with parent callback - avoid infinite loop
useEffect(() => {
  const selectedRowIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
  const currentIds = selectedIds || [];
  
  // Only call if arrays are actually different
  const isSame = 
    selectedRowIds.length === currentIds.length && 
    selectedRowIds.every(id => currentIds.includes(id));
  
  if (!isSame && onSelectionChange) {
    onSelectionChange(selectedRowIds);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [rowSelection]); // Intentionally exclude selectedIds to prevent loop

// Sync incoming selectedIds with local rowSelection state
// This handles external resets (e.g., after bulk delete)
useEffect(() => {
  const currentKeys = Object.keys(rowSelection).filter(k => rowSelection[k]);
  const incomingKeys = selectedIds || [];
  
  // Only update if truly different (external change)
  const isSame = 
    currentKeys.length === incomingKeys.length && 
    currentKeys.every(id => incomingKeys.includes(id));
  
  if (!isSame) {
    const newSelection: RowSelectionState = {};
    incomingKeys.forEach(id => {
      newSelection[id] = true;
    });
    setRowSelection(newSelection);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedIds]); // Intentionally exclude rowSelection to prevent loop
```

---

## Resultado Esperado

1. Usuário clica no checkbox de uma organização
2. `row.toggleSelected(true)` atualiza `rowSelection`
3. Efeito 1 compara e detecta diferença → chama `onSelectionChange`
4. Pai atualiza `selectedIds`
5. Efeito 2 compara e detecta que são iguais → **não faz nada** (evita loop)
6. Checkbox permanece marcado corretamente
