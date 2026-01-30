

# Adicionar Dropdown "Mais Ações" na OrganizationDetails

## Objetivo

Substituir o botão de Editar solto por um dropdown "Mais Ações" contendo Editar e Excluir.

---

## Modificações

### 1. Novos Imports

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { useToast } from '@/hooks/use-toast';
```

### 2. Novo Estado e Mutation

```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const { toast } = useToast();
const queryClient = useQueryClient();

const deleteOrganizationMutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
    toast({ title: 'Organização excluída com sucesso!' });
    navigate('/organizations');
  },
  onError: (error: Error) => {
    toast({
      variant: 'destructive',
      title: 'Erro ao excluir',
      description: error.message,
    });
  },
});
```

### 3. Substituir Botão Editar por Dropdown

De:
```typescript
<Button 
  variant="outline" 
  size="icon"
  onClick={() => setEditSheetOpen(true)}
>
  <Pencil className="h-4 w-4" />
</Button>
```

Para:
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setEditSheetOpen(true)}>
      <Pencil className="h-4 w-4 mr-2" />
      Editar
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem 
      onClick={() => setDeleteDialogOpen(true)}
      className="text-destructive focus:text-destructive"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Excluir
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 4. Adicionar DeleteConfirmDialog

```typescript
<DeleteConfirmDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  title="Excluir Organização"
  itemName={organization?.name}
  onConfirm={() => deleteOrganizationMutation.mutate()}
  isDeleting={deleteOrganizationMutation.isPending}
/>
```

---

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/OrganizationDetails.tsx` | Adicionar dropdown com Editar/Excluir |

