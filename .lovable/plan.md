
# Plano: Mover Checkbox para Coluna Nome na Tabela de Pessoas

## Objetivo
Aplicar a mesma alteração feita na tabela de Organizações, movendo a checkbox de seleção para dentro da coluna "Nome" ao invés de ter uma coluna separada.

---

## Alterações Necessárias

### Arquivo: `src/components/people/PeopleTable.tsx`

**1. Remover a coluna `selectColumn` separada (linhas 245-266)**

A definição atual:
```typescript
const selectColumn: ColumnDef<PersonWithOrg> = {
  id: 'select',
  header: ({ table }) => ( <Checkbox ... /> ),
  cell: ({ row }) => ( <Checkbox ... /> ),
  ...
};
```

**2. Criar flag `showSelection`**

```typescript
const showSelection = isAdmin && onSelectionChange;
```

**3. Modificar a coluna `name` para incluir checkbox**

Alterar o header e cell da coluna nome para:

```typescript
{
  id: 'name',
  accessorKey: 'name',
  header: ({ column, table }) => (
    <div className="flex items-center gap-2">
      {showSelection && (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todos"
          className="translate-y-[2px]"
        />
      )}
      <SortableHeader column={column} title="Nome" />
    </div>
  ),
  cell: ({ row }) => (
    <div className="flex items-center gap-2">
      {showSelection && (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selecionar linha"
          className="translate-y-[2px]"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <Link to={`/people/${row.original.id}`} className="...">
        {row.original.name}
      </Link>
    </div>
  ),
},
```

**4. Simplificar `allColumns`**

Remover a lógica condicional que adiciona `selectColumn`:

```typescript
// Antes (linha 458-460):
const allColumns = useMemo(() => {
  return isAdmin ? [selectColumn, ...columns] : columns;
}, [isAdmin, columns, selectColumn]);

// Depois:
const allColumns = columns;
```

**5. Atualizar dependências do useMemo**

Adicionar `showSelection` às dependências do array de colunas.

---

## Resumo das Mudanças

| Item | Ação |
|------|------|
| `selectColumn` (linhas 245-266) | Remover |
| Flag `showSelection` | Criar |
| Coluna `name` header | Adicionar checkbox + flex container |
| Coluna `name` cell | Adicionar checkbox + flex container |
| `allColumns` memo | Simplificar para usar apenas `columns` |
| Dependências do `columns` memo | Adicionar `showSelection` |

---

## Resultado Visual

A checkbox aparecerá ao lado esquerdo do nome da pessoa na primeira coluna, igual ao comportamento atual da tabela de Organizações.
