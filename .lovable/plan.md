
# Otimização de Performance da Página /people

## Problemas Identificados

Após análise detalhada do código, identifiquei **4 problemas críticos** que causam lentidão na navegação e interação:

---

## PROBLEMA 1: Animações Escalonadas Bloqueiam Interação

### Sintoma
Ao navegar para /people, as linhas da tabela não são clicáveis por alguns segundos.

### Causa Raiz
Cada linha da tabela tem uma animação `animate-fade-in` com delay escalonado:

```tsx
// PeopleTable.tsx - Linha 738-739
<TableRow
  key={row.id}
  className="animate-fade-in"
  style={{ animationDelay: `${index * 30}ms` }}
>
```

Com 100 registros por página, a última linha só anima após **3000ms** (3 segundos)! Durante a animação, a opacidade começa em 0 e os elementos não recebem eventos de clique corretamente.

### Solução
Remover o delay escalonado e usar animação instantânea ou sem animação nas linhas individuais. A animação de fade-in já está na página principal (`People.tsx linha 323`).

---

## PROBLEMA 2: Query Secundária para Profiles Bloqueia Renderização

### Sintoma
A tabela demora para mostrar dados mesmo após receber resposta do servidor.

### Causa Raiz
Na função `fetchPeople` (People.tsx linhas 200-221), após buscar os dados das pessoas, há uma segunda query síncrona para buscar profiles dos owners:

```typescript
// Bloqueia a resposta até buscar profiles
if (ownerIds.length > 0) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, avatar_url')
    .in('user_id', ownerIds);
  // ...
}
```

Isso adiciona latência extra à query principal.

### Solução
Buscar os profiles em paralelo usando `Promise.all` ou mover para uma query separada que não bloqueia a renderização inicial.

---

## PROBLEMA 3: Query de Tags Assignments Dispara em Cada Renderização

### Sintoma
Re-renders desnecessários e queries duplicadas.

### Causa Raiz
No `PeopleTable.tsx` (linhas 203-228), a query de tag assignments é disparada baseada no `personIds`, que muda a cada re-render:

```typescript
const personIds = useMemo(() => people.map(p => p.id), [people]);
const personIdsKey = useMemo(() => personIds.slice().sort().join(','), [personIds]);

const { data: allTagAssignments = [] } = useQuery({
  queryKey: ['person-tag-assignments-bulk', personIdsKey],
  // ...
});
```

O problema é que `people` é um array novo a cada render (vem de `usePaginatedQuery`), causando recálculos desnecessários.

### Solução
Usar uma referência estável para comparação ou implementar um hook com cache mais inteligente.

---

## PROBLEMA 4: PersonDetails Faz 6+ Queries em Paralelo na Montagem

### Sintoma
Ao clicar em uma pessoa, a página demora para abrir.

### Causa Raiz
O hook `usePersonDetails` (linhas 57-179) dispara 5 queries em paralelo imediatamente:
1. `person` - dados da pessoa
2. `person-history` - histórico
3. `person-notes` - notas
4. `person-activities` - atividades
5. `person-deals` - negócios

Além disso, `PersonDetails.tsx` adiciona mais queries:
- `usePersonFiles`
- `useSentEmails`
- `usePersonWhatsAppConversations`
- `useMergeBackups`

E ainda há queries condicionais para `default-pipeline` e `stages`.

### Solução
Implementar lazy loading - carregar apenas os dados essenciais inicialmente (pessoa + sidebar) e carregar o resto quando o usuário acessar cada tab.

---

## Plano de Implementação

### Fase 1: Remover Animações Bloqueantes na Tabela

**Arquivo**: `src/components/people/PeopleTable.tsx`

Remover o delay escalonado das animações:

```tsx
// ANTES (linhas 736-740):
<TableRow
  key={row.id}
  className="animate-fade-in"
  style={{ animationDelay: `${index * 30}ms` }}
>

// DEPOIS:
<TableRow
  key={row.id}
  className="transition-colors"
>
```

### Fase 2: Paralelizar Query de Profiles

**Arquivo**: `src/pages/People.tsx`

Executar a busca de dados principais e profiles em paralelo:

```typescript
const fetchPeople = async ({ from, to }: { from: number; to: number }) => {
  // Query principal
  let query = supabase
    .from('people')
    .select(`
      *,
      organizations:organizations!people_organization_id_fkey(id, name, cnpj, address_city, address_state, automotores)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  // ... aplicar filtros ...

  const { data, error, count } = await query;
  if (error) throw error;
  
  // Retornar imediatamente sem esperar profiles
  // Profiles serão carregados em query separada
  return { data: data as PersonWithOrg[], count };
};
```

Mover a busca de profiles para uma query separada no `PeopleTable`:

```typescript
// PeopleTable.tsx
const ownerIds = useMemo(() => 
  [...new Set(people.map(p => p.owner_id).filter(Boolean))],
  [people]
);

const { data: ownerProfiles } = useQuery({
  queryKey: ['owner-profiles', ownerIds.sort().join(',')],
  queryFn: async () => {
    if (ownerIds.length === 0) return {};
    const { data } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, avatar_url')
      .in('user_id', ownerIds);
    return Object.fromEntries((data || []).map(p => [p.user_id, p]));
  },
  enabled: ownerIds.length > 0,
  staleTime: 60000, // Cache por 1 minuto
});
```

### Fase 3: Implementar Lazy Loading no PersonDetails

**Arquivo**: `src/hooks/usePersonDetails.ts`

Adicionar flag `enabled` baseada na tab ativa:

```typescript
export function usePersonDetails(personId: string, options?: { loadHistory?: boolean; loadNotes?: boolean; loadActivities?: boolean; loadDeals?: boolean }) {
  const { loadHistory = true, loadNotes = true, loadActivities = true, loadDeals = true } = options || {};

  // Query de pessoa (sempre carrega)
  const { data: person, isLoading, ... } = useQuery({
    queryKey: ['person', personId],
    queryFn: async () => { ... },
    enabled: !!personId,
  });

  // Queries secundárias com lazy loading
  const { data: history = [] } = useQuery({
    queryKey: ['person-history', personId],
    queryFn: async () => { ... },
    enabled: !!personId && loadHistory,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['person-notes', personId],
    queryFn: async () => { ... },
    enabled: !!personId && loadNotes,
  });

  // ... etc
}
```

**Arquivo**: `src/pages/PersonDetails.tsx`

Usar estado de tab ativa para lazy loading:

```typescript
const [activeTab, setActiveTab] = useState('notes');

const {
  person,
  history,
  notes,
  activities,
  deals,
  isLoading,
  ...
} = usePersonDetails(id || '', {
  loadHistory: activeTab === 'history',
  loadNotes: activeTab === 'notes',
  loadActivities: activeTab === 'activities',
  loadDeals: activeTab === 'deals',
});
```

### Fase 4: Estabilizar personIds no PeopleTable

**Arquivo**: `src/components/people/PeopleTable.tsx`

Usar referência estável para evitar re-renders:

```typescript
// Estabilizar a key baseada nos IDs ordenados
const personIdsStableKey = useMemo(() => {
  const ids = people.map(p => p.id);
  ids.sort();
  return ids.join(',');
}, [people]);

const { data: allTagAssignments = [] } = useQuery({
  queryKey: ['person-tag-assignments-bulk', personIdsStableKey],
  queryFn: async () => {
    const personIds = personIdsStableKey.split(',');
    if (personIds.length === 0 || personIds[0] === '') return [];
    // ... query
  },
  enabled: people.length > 0,
  staleTime: 30000,
});
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/people/PeopleTable.tsx` | Remover animação escalonada, estabilizar queries, adicionar query de profiles |
| `src/pages/People.tsx` | Remover busca de profiles da função fetchPeople |
| `src/hooks/usePersonDetails.ts` | Adicionar lazy loading com flags enabled |
| `src/pages/PersonDetails.tsx` | Implementar lazy loading baseado em tab ativa |

---

## Impacto Esperado

### Antes
- 3+ segundos até linhas serem clicáveis
- 2-3 segundos para carregar página de detalhes
- Queries duplicadas em cada navegação

### Depois
- Linhas clicáveis imediatamente (< 500ms)
- Página de detalhes carrega em < 1 segundo
- Queries otimizadas com cache inteligente

---

## Seção Técnica

### Por que as animações escalonadas bloqueiam cliques?

A animação `animate-fade-in` começa com `opacity: 0`. Durante a animação:
1. O elemento está no DOM mas com opacidade 0
2. O browser pode otimizar elementos invisíveis, não processando eventos de clique
3. Links e botões dentro da linha herdam o comportamento

### Por que lazy loading melhora a performance?

Atualmente, ao abrir PersonDetails, 8+ queries são disparadas em paralelo:
- Isso satura a conexão
- O servidor processa todas simultaneamente
- O browser espera todas completarem para "first contentful paint"

Com lazy loading:
- Apenas 2-3 queries críticas são feitas inicialmente
- Dados secundários são carregados conforme necessário
- A página fica interativa muito mais rápido

### Stale Time e Cache

O `staleTime: 30000` (30 segundos) significa:
- Dados são considerados "frescos" por 30 segundos
- Navegações rápidas entre páginas não refazem queries
- Melhora significativamente a UX em navegação frequente
