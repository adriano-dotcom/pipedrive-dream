
# Corrigir Clique em Contatos na Tabela de Pessoas

## Problema

Ao clicar no nome de um contato na tabela de Pessoas, a navegacao nao funciona. O erro "Node is detached from document" indica que o DOM esta sendo recriado antes que o clique complete a navegacao.

## Causa Raiz

Existem dois `useEffect` no `PeopleTable.tsx` (linhas 188-201) que criam um loop de sincronizacao entre `rowSelection` (estado local) e `selectedIds` (prop do componente pai):

1. `rowSelection` muda -> dispara `onSelectionChange` -> pai atualiza `selectedIds`
2. `selectedIds` muda -> dispara `setRowSelection` -> volta para o passo 1

Esse loop causa re-renderizacoes rapidas que destroem e recriam os elementos DOM da tabela, fazendo com que o link `<Link>` que o usuario clicou seja desconectado do documento antes que a navegacao aconteca.

## Solucao

Adicionar comparacoes de valor antes de disparar atualizacoes de estado, quebrando o loop:

- No efeito que sincroniza `rowSelection` -> `selectedIds`: comparar os arrays antes de chamar `onSelectionChange`
- No efeito que sincroniza `selectedIds` -> `rowSelection`: comparar com o estado atual antes de chamar `setRowSelection`

## Detalhes Tecnicos

### Arquivo: `src/components/people/PeopleTable.tsx`

Substituir os dois useEffects (linhas 188-201) por versoes que fazem comparacao de valor:

```text
// Sync row selection -> parent (com comparacao)
useEffect(() => {
  const selectedRowIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
  // Comparar antes de atualizar para evitar loop
  const currentSorted = [...selectedIds].sort().join(',');
  const newSorted = [...selectedRowIds].sort().join(',');
  if (currentSorted !== newSorted) {
    onSelectionChange?.(selectedRowIds);
  }
}, [rowSelection]);

// Sync parent -> row selection (com comparacao)
useEffect(() => {
  const currentSelectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
  const currentSorted = [...currentSelectedIds].sort().join(',');
  const newSorted = [...selectedIds].sort().join(',');
  if (currentSorted !== newSorted) {
    const newSelection: RowSelectionState = {};
    selectedIds.forEach(id => { newSelection[id] = true; });
    setRowSelection(newSelection);
  }
}, [selectedIds]);
```

### Nenhum outro arquivo precisa ser alterado

A pagina de detalhes (`PersonDetails.tsx`) funciona corretamente - o problema e exclusivamente no loop de re-renderizacao da tabela.
