
# Melhorar Header da Pagina DealDetails

## Objetivo

Padronizar a pagina de detalhes de negocios (`/deals/[id]`) com o mesmo padrao UX das paginas de Pessoas e Organizacoes, incluindo:

- Avatar/badge visual com cor do estagio
- Dropdown de acoes adicionais (...)
- Botao "Nova Atividade"
- Funcionalidade de edicao
- Funcionalidade de exclusao com confirmacao

---

## Comparativo Atual vs Proposto

```text
ATUAL:
┌─────────────────────────────────────────────────────────┐
│ ← RecordNav  Titulo do Negocio                [✓] [✗] [✏️]│
│              Pipeline • Etapa                           │
│              R$ 50.000                                  │
└─────────────────────────────────────────────────────────┘

PROPOSTO:
┌─────────────────────────────────────────────────────────┐
│ ← RecordNav  [🟢] Titulo do Negocio [Quente] [📅 Atividade] [✓] [✗] [✏️] [...]│
│                   Pipeline • Etapa                      │
│                   R$ 50.000                             │
└─────────────────────────────────────────────────────────┘
```

---

## Modificacoes no Arquivo DealDetails.tsx

### 1. Adicionar Avatar Visual com Cor do Estagio

Criar um icone visual antes do titulo que mostra a cor do estagio atual:

```typescript
<div 
  className="flex h-12 w-12 items-center justify-center rounded-xl border"
  style={{ 
    backgroundColor: `${deal.stage?.color}20`, 
    borderColor: `${deal.stage?.color}40` 
  }}
>
  <Handshake 
    className="h-6 w-6" 
    style={{ color: deal.stage?.color }} 
  />
</div>
```

### 2. Adicionar Badge de Label

Se o deal tiver um label (Quente, Morno, Frio), exibir badge colorido como em Pessoas/Organizacoes:

```typescript
{deal.label && (
  <Badge variant="secondary" className={getLabelColor(deal.label)}>
    {deal.label}
  </Badge>
)}
```

### 3. Adicionar Botao "Nova Atividade"

Adicionar botao consistente com as outras paginas:

```typescript
<Button 
  variant="outline" 
  size="sm"
  onClick={() => {
    setEditingActivity(null);
    setActivityFormOpen(true);
  }}
>
  <Calendar className="h-4 w-4 mr-2" />
  Nova Atividade
</Button>
```

### 4. Adicionar Estado para Edicao e Exclusao

```typescript
const [editSheetOpen, setEditSheetOpen] = useState(false);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
```

### 5. Adicionar Dropdown "Mais Acoes"

Menu dropdown com opcoes adicionais:

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

### 6. Adicionar Funcionalidade de Exclusao

Buscar pipeline/stages para o formulario de edicao e adicionar mutation de exclusao:

```typescript
// Mutation para deletar deal
const deleteDealMutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => {
    toast({ title: 'Negocio excluido com sucesso!' });
    navigate('/deals');
  },
  onError: (error) => {
    toast({
      variant: 'destructive',
      title: 'Erro ao excluir',
      description: error.message,
    });
  },
});
```

### 7. Adicionar Componentes no JSX

```typescript
{/* Delete Confirm Dialog */}
<DeleteConfirmDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  title="Excluir Negocio"
  itemName={deal.title}
  onConfirm={() => deleteDealMutation.mutate()}
  isDeleting={deleteDealMutation.isPending}
/>

{/* Deal Edit Sheet */}
<DealFormSheet
  open={editSheetOpen}
  onOpenChange={setEditSheetOpen}
  deal={deal}
  pipelineId={deal.pipeline_id}
  stages={stages}
/>
```

---

## Novos Imports Necessarios

```typescript
import { Calendar, MoreVertical, Trash2, Handshake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { DealFormSheet } from '@/components/deals/DealFormSheet';
```

---

## Funcao Helper para Cores de Label

```typescript
const getLabelColor = (label: string | null) => {
  switch (label) {
    case 'Quente':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'Morno':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Frio':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return '';
  }
};
```

---

## Layout Final do Header

```text
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  [←]  [< X de Y >]  [🟢]  Titulo do Negocio  [Quente]               │
│                           Pipeline • Etapa                           │
│                           R$ 50.000,00                               │
│                                                                      │
│                      [📅 Nova Atividade] [✓ Ganho] [✗ Perdido] [...]│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Dropdown "..." contem:
├── Editar
├── ─────────
└── Excluir (vermelho)
```

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/DealDetails.tsx` | Adicionar avatar, badge, dropdown, dialogs e funcionalidades |

---

## Observacoes Importantes

1. **RLS Policy**: A exclusao de deals requer role `admin` conforme RLS existente
2. **Reutilizacao**: Usa componentes existentes (DeleteConfirmDialog, DealFormSheet, Badge, DropdownMenu)
3. **Consistencia**: Segue exatamente o padrao visual de PersonDetails e OrganizationDetails
4. **Responsividade**: Os botoes ja usam classes responsivas existentes

---

## Estimativa de Tempo

| Tarefa | Tempo |
|--------|-------|
| Adicionar avatar com cor do estagio | 15min |
| Adicionar badge de label | 10min |
| Adicionar botao Nova Atividade | 5min |
| Adicionar dropdown Mais Acoes | 15min |
| Implementar exclusao com dialog | 20min |
| Conectar formulario de edicao | 15min |
| Testes e ajustes | 20min |
| **Total** | **~1h30** |
