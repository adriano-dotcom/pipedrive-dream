
# Filtro por Etiquetas nas Listagens

## Objetivo

Adicionar um filtro multi-select de etiquetas nas paginas de listagem de **Pessoas**, **Organizacoes** e **Negocios**, permitindo aos usuarios filtrar registros que possuam uma ou mais etiquetas especificas.

---

## Interface do Usuario

O filtro sera adicionado ao lado do campo de busca existente, seguindo o mesmo padrao visual:

```text
┌─────────────────────────────────────────────────────────────────┐
│  [🔍 Buscar por nome...      ]   [🏷️ Etiquetas ▼]  [Limpar]   │
│                                                                 │
│  Tags selecionadas: [Cliente VIP ×] [Lead Quente ×]            │
└─────────────────────────────────────────────────────────────────┘
```

### Comportamento do Filtro

- **Multi-select**: Usuario pode selecionar multiplas etiquetas
- **Logica OR**: Mostrar registros que tenham QUALQUER uma das etiquetas selecionadas
- **Badges removiveis**: Tags selecionadas aparecem como badges clicaveis para remocao rapida
- **Botao limpar**: Remove todos os filtros de uma vez
- **Persistencia**: Filtros salvos no localStorage para cada entidade

---

## Arquitetura da Solucao

### 1. Componente de Filtro Reutilizavel

Criar um componente generico `TagFilterPopover` que pode ser usado em todas as tres entidades:

```text
TagFilterPopover
├── Popover com lista de todas as tags disponiveis
├── Checkbox para cada tag
├── Busca para filtrar tags (opcional se muitas)
├── Contador de tags selecionadas no trigger
└── Badges das tags selecionadas exibidos abaixo
```

### 2. Fluxo de Dados

```text
Usuario seleciona tag(s) no filtro
        │
        v
Estado local atualizado (selectedTagIds)
        │
        v
Query de assignments busca entidades com essas tags
        │
        v
Lista filtrada client-side (intersection de IDs)
        │
        v
Tabela/Lista renderizada com dados filtrados
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/shared/TagFilterPopover.tsx` | Componente reutilizavel de filtro por tags |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/People.tsx` | Adicionar estado de filtro e componente TagFilterPopover |
| `src/pages/Organizations.tsx` | Adicionar estado de filtro e componente TagFilterPopover |
| `src/components/deals/KanbanFilters.tsx` | Adicionar filtro por deal_tags ao filtro existente |
| `src/components/deals/KanbanBoard.tsx` | Aplicar filtro de tags nos deals |
| `src/components/deals/DealsListView.tsx` | Aplicar filtro de tags nos deals |

---

## Secao Tecnica

### Componente TagFilterPopover

```typescript
interface TagFilterPopoverProps {
  // Tags disponiveis para selecao
  tags: { id: string; name: string; color: string }[];
  isLoading?: boolean;
  // Tags selecionadas
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  // Personalizacao
  placeholder?: string;
  emptyMessage?: string;
}
```

O componente usa:
- Popover do Radix para o dropdown
- Checkbox para selecao multipla
- TagBadge para exibir tags selecionadas
- Contagem de filtros ativos no trigger

### Integracao em People.tsx

```typescript
// Estado adicional
const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
  const saved = localStorage.getItem('people-tag-filter');
  return saved ? JSON.parse(saved) : [];
});

// Buscar todas as tags de pessoas
const { data: personTags = [] } = usePersonTags();

// Buscar assignments para filtrar
const { data: tagAssignments = [] } = useQuery({
  queryKey: ['person-tag-filter-assignments', selectedTagIds],
  queryFn: async () => {
    if (selectedTagIds.length === 0) return [];
    const { data } = await supabase
      .from('person_tag_assignments')
      .select('person_id')
      .in('tag_id', selectedTagIds);
    return data?.map(a => a.person_id) || [];
  },
  enabled: selectedTagIds.length > 0,
});

// Filtrar dados
const filteredPeople = useMemo(() => {
  if (!people) return [];
  if (selectedTagIds.length === 0) return people;
  const validIds = new Set(tagAssignments);
  return people.filter(p => validIds.has(p.id));
}, [people, selectedTagIds, tagAssignments]);
```

### Integracao em Organizations.tsx

Mesma estrutura de People.tsx, usando:
- `useOrganizationTags()` para buscar tags
- `organization_tag_assignments` para filtrar

### Integracao em KanbanFilters.tsx

Adicionar ao `KanbanFiltersState` existente:

```typescript
export interface KanbanFiltersState {
  insuranceTypes: string[];
  labels: string[];
  dateRange: { from: Date | null; to: Date | null };
  ownerId: string | null;
  tagIds: string[];  // NOVO
}
```

Adicionar novo filtro no grid de filtros:

```typescript
// Deal Tags Filter
<div className="space-y-2">
  <label className="text-sm font-medium">Etiquetas</label>
  <Popover>
    {/* Similar ao filtro de tipo de seguro */}
  </Popover>
</div>
```

### Aplicacao do Filtro nos Deals

Em KanbanBoard.tsx e DealsListView.tsx, buscar deal_tag_assignments e filtrar:

```typescript
// Buscar assignments para tags selecionadas
const { data: dealTagAssignments = [] } = useQuery({
  queryKey: ['deal-tag-filter-assignments', filters.tagIds],
  queryFn: async () => {
    if (filters.tagIds.length === 0) return [];
    const { data } = await supabase
      .from('deal_tag_assignments')
      .select('deal_id')
      .in('tag_id', filters.tagIds);
    return data?.map(a => a.deal_id) || [];
  },
  enabled: filters.tagIds.length > 0,
});

// No filteredDeals, adicionar:
if (filters.tagIds.length > 0) {
  const validIds = new Set(dealTagAssignments);
  if (!validIds.has(deal.id)) return false;
}
```

---

## Persistencia

Cada entidade salva seus filtros de tag no localStorage:

| Chave | Entidade |
|-------|----------|
| `people-tag-filter` | Pessoas |
| `org-tag-filter` | Organizacoes |
| `kanban-filters` | Negocios (ja existente, adicionar tagIds) |

---

## UI/UX

### Layout do Filtro

```text
Pessoas / Organizacoes:
┌─────────────────────────────────────────────────────────────┐
│ [🔍 Buscar...]           [🏷️ Etiquetas (2) ▼]  [Limpar]    │
│                                                             │
│ [Cliente VIP ×] [Lead Quente ×]                            │
└─────────────────────────────────────────────────────────────┘

Negocios (dentro do painel de filtros existente):
┌─────────────────────────────────────────────────────────────┐
│ Tipo de Seguro  │  Etiqueta  │  Periodo  │  Responsavel   │
│ [Selecionar...] │ [Label v]  │ [Data]    │  [Todos v]     │
│                                                             │
│ Etiquetas (Deal Tags)                                       │
│ [🏷️ Selecionar... ▼]                                        │
└─────────────────────────────────────────────────────────────┘
```

### Estados Visuais

- **Sem filtro**: Botao discreto com icone de tag
- **Com filtro**: Botao com badge de contagem + tags selecionadas visiveis
- **Limpar**: Remove todas as tags selecionadas

---

## Resumo das Mudancas

1. **Novo componente**: `TagFilterPopover.tsx` - filtro reutilizavel
2. **People.tsx**: Adicionar filtro + logica de filtragem
3. **Organizations.tsx**: Adicionar filtro + logica de filtragem  
4. **KanbanFilters.tsx**: Adicionar campo tagIds ao estado e UI
5. **KanbanBoard.tsx**: Aplicar filtro de tags nos deals
6. **DealsListView.tsx**: Aplicar filtro de tags nos deals
