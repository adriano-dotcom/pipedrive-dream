

# Adicionar Selecao Multipla e Exclusao em Lote de Organizacoes

## Objetivo

Adicionar checkboxes para selecionar multiplas organizacoes na tabela e um botao para excluir as selecionadas de uma vez.

---

## Interface do Usuario

### Tabela Desktop

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [Exportar] [Colunas]                              [3 selecionadas] [🗑️]  │
├──────────────────────────────────────────────────────────────────────────┤
│ [☑] │ Nome           │ CNPJ           │ Contato Principal │ Acoes       │
├──────────────────────────────────────────────────────────────────────────┤
│ [✓] │ CATEDRAL       │ 26.872.410/... │ Hamilton          │ [✏️] [🗑️]   │
│ [✓] │ PRAGON         │ 12.345.678/... │ Fernando          │ [✏️] [🗑️]   │
│ [✓] │ EMPRESA X      │ 98.765.432/... │ Maria             │ [✏️] [🗑️]   │
│ [ ] │ OUTRA EMPRESA  │ 11.222.333/... │ João              │ [✏️] [🗑️]   │
└──────────────────────────────────────────────────────────────────────────┘

Legenda:
- [☑] no cabecalho = checkbox para selecionar/desmarcar todos
- [✓] = linha selecionada
- [ ] = linha nao selecionada
- [3 selecionadas] [🗑️] = barra de acoes em lote (aparece quando ha selecao)
```

### Mobile

Na versao mobile, cada card tera um checkbox para selecao, e a barra de acoes ficara fixa no topo quando houver selecao.

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/Organizations.tsx` | Gerenciar estado de selecao e mutation de exclusao em lote |
| `src/components/organizations/OrganizationsTable.tsx` | Adicionar coluna de checkbox e barra de acoes |
| `src/components/organizations/OrganizationsMobileList.tsx` | Adicionar checkbox em cada card |
| `src/components/shared/DeleteConfirmDialog.tsx` | Suportar exclusao de multiplos itens (itemCount) |

---

## Secao Tecnica

### 1. Organizations.tsx - Estado e Mutation

Adicionar estado de selecao e mutation para exclusao em lote:

```typescript
// Estado para IDs selecionados
const [selectedIds, setSelectedIds] = useState<string[]>([]);

// Mutation para exclusao em lote
const bulkDeleteMutation = useMutation({
  mutationFn: async (ids: string[]) => {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .in('id', ids);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    toast.success(`${selectedIds.length} organização(ões) excluída(s) com sucesso!`);
    setSelectedIds([]);
    setBulkDeleteOpen(false);
  },
  onError: (error) => {
    toast.error('Erro ao excluir organizações: ' + error.message);
  },
});

// Estado para dialog de confirmacao
const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

// Handler
const handleBulkDelete = () => {
  bulkDeleteMutation.mutate(selectedIds);
};
```

Passar props para a tabela:

```typescript
<OrganizationsTable
  organizations={filteredOrganizations}
  isAdmin={isAdmin}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onSetPrimaryContact={handleSetPrimaryContact}
  isSettingPrimaryContact={setPrimaryContactMutation.isPending}
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  onBulkDelete={() => setBulkDeleteOpen(true)}
/>
```

### 2. OrganizationsTable.tsx - Checkbox e Barra de Acoes

Adicionar imports e props:

```typescript
import { Checkbox } from '@/components/ui/checkbox';

interface OrganizationsTableProps {
  // ... props existentes ...
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onBulkDelete?: () => void;
}
```

Adicionar coluna de selecao como primeira coluna:

```typescript
const selectColumn: ColumnDef<OrganizationWithContact> = {
  id: 'select',
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected()}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Selecionar todos"
      className="translate-y-[2px]"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Selecionar linha"
      className="translate-y-[2px]"
      onClick={(e) => e.stopPropagation()}
    />
  ),
  enableSorting: false,
  enableHiding: false,
};

// Adicionar na lista de colunas (apenas se admin)
const allColumns = isAdmin 
  ? [selectColumn, ...columns] 
  : columns;
```

Configurar row selection no useReactTable:

```typescript
const table = useReactTable({
  data: organizations,
  columns: allColumns,
  state: {
    sorting,
    columnOrder,
    columnVisibility,
    pagination,
    rowSelection,  // Novo
  },
  enableRowSelection: isAdmin,  // Apenas admin pode selecionar
  getRowId: (row) => row.id,    // Usar ID da organizacao
  onRowSelectionChange: setRowSelection,
  // ... resto da config
});

// Sincronizar selecao com callback do pai
useEffect(() => {
  const selectedRowIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
  onSelectionChange?.(selectedRowIds);
}, [rowSelection, onSelectionChange]);
```

Adicionar barra de acoes em lote na toolbar (quando ha selecao):

```typescript
{/* Barra de ferramentas */}
<div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
  <div className="flex items-center gap-4">
    <ExportButtons ... />
    
    {/* Acoes em lote - aparece quando ha selecao */}
    {isAdmin && selectedIds && selectedIds.length > 0 && (
      <div className="flex items-center gap-2 pl-4 border-l">
        <span className="text-sm text-muted-foreground">
          {selectedIds.length} selecionada(s)
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          className="h-8"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Excluir
        </Button>
      </div>
    )}
  </div>
  
  <DropdownMenu> ... </DropdownMenu>
</div>
```

### 3. OrganizationsMobileList.tsx - Checkbox nos Cards

Adicionar props e checkbox em cada card:

```typescript
interface OrganizationsMobileListProps {
  // ... props existentes ...
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onBulkDelete?: () => void;
}

// Em cada card
<div className="ios-glass p-4 rounded-xl space-y-3">
  {/* Header com checkbox */}
  <div className="flex items-start gap-3">
    {isAdmin && onSelectionChange && (
      <Checkbox
        checked={selectedIds?.includes(org.id)}
        onCheckedChange={(checked) => {
          if (checked) {
            onSelectionChange([...selectedIds || [], org.id]);
          } else {
            onSelectionChange(selectedIds?.filter(id => id !== org.id) || []);
          }
        }}
        className="mt-1"
      />
    )}
    <div className="flex-1 flex items-start justify-between gap-2">
      <Link ...>{org.name}</Link>
      {org.label && <Badge ...>{org.label}</Badge>}
    </div>
  </div>
  
  {/* ... resto do card ... */}
</div>

// Barra de acoes fixa no topo quando ha selecao (mobile)
{isAdmin && selectedIds && selectedIds.length > 0 && (
  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 flex items-center justify-between">
    <span className="text-sm font-medium">
      {selectedIds.length} selecionada(s)
    </span>
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onSelectionChange?.([]) }
      >
        Limpar
      </Button>
      <Button 
        variant="destructive" 
        size="sm"
        onClick={onBulkDelete}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Excluir
      </Button>
    </div>
  </div>
)}
```

### 4. DeleteConfirmDialog.tsx - Suporte a Multiplos Itens

Adicionar prop opcional para quantidade:

```typescript
interface DeleteConfirmDialogProps {
  // ... props existentes ...
  itemCount?: number;  // Nova prop para exclusao em lote
}

export function DeleteConfirmDialog({
  // ... props ...
  itemCount,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog ...>
      <AlertDialogContent ...>
        <AlertDialogHeader>
          ...
          <AlertDialogDescription className="pt-2">
            {description || (
              itemCount && itemCount > 1 ? (
                <>
                  Tem certeza que deseja excluir{' '}
                  <span className="font-medium text-foreground">
                    {itemCount} organizações
                  </span>
                  ? Esta ação não pode ser desfeita.
                </>
              ) : (
                <>
                  Tem certeza que deseja excluir{' '}
                  {itemName && (
                    <span className="font-medium text-foreground">"{itemName}"</span>
                  )}
                  ? Esta ação não pode ser desfeita.
                </>
              )
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        ...
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Resumo das Alteracoes

1. **Organizations.tsx**: Adicionar estado `selectedIds`, mutation `bulkDeleteMutation`, e dialog de confirmacao
2. **OrganizationsTable.tsx**: Adicionar coluna de checkbox, habilitar `rowSelection` no TanStack Table, mostrar barra de acoes em lote
3. **OrganizationsMobileList.tsx**: Adicionar checkbox em cada card e barra de acoes fixa
4. **DeleteConfirmDialog.tsx**: Adicionar prop `itemCount` para mensagem de exclusao em lote

---

## Restricoes de Seguranca

- Apenas usuarios com `isAdmin = true` podem ver os checkboxes e excluir
- A RLS do banco ja restringe DELETE apenas para admins (`has_role(auth.uid(), 'admin'::app_role)`)

