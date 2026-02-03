
# Correção: Lentidão ao Clicar em Contatos

## Diagnóstico

A página de detalhes de pessoa (`PersonDetails.tsx`) está lenta porque:

### 1. Excesso de Queries Simultâneas (11+ queries paralelas)

Ao abrir a página, as seguintes queries são disparadas **imediatamente**:

| Query | Fonte | Problema |
|-------|-------|----------|
| `person` | usePersonDetails | Necessária |
| `person-history` | usePersonDetails | Necessária |
| `person-notes` | usePersonDetails | Necessária |
| `person-activities` | usePersonDetails | Necessária |
| `person-deals` | usePersonDetails | Necessária |
| `person-files` | usePersonFiles | Necessária |
| `sent-emails` | useSentEmails | Necessária |
| `whatsapp-conversations` | usePersonWhatsAppConversations | Necessária |
| `merge-backups` | useMergeBackups | **Pode retornar undefined** |
| `person-tag-assignments` | usePersonTagAssignments | Necessária |
| `default-pipeline` | PersonDetails | **Carrega antes de ser usada** |
| `stages` | PersonDetails | **Carrega antes de ser usada** |
| `team-members` | useTeamMembers | **Sempre carrega** |

### 2. Queries de Formulários Carregadas Antecipadamente

Os componentes `ActivityFormSheet` e `DealFormSheet` são montados na renderizacao inicial e suas queries executam **mesmo com os sheets fechados**:

| Query | Componente | Registros Carregados |
|-------|------------|---------------------|
| `deals-select` | ActivityFormSheet | Todos os deals abertos |
| `people-select` | ActivityFormSheet | **Todas as 990+ pessoas** |
| `organizations-select` | ActivityFormSheet | Todas as organizacoes |
| `pipelines-select` | DealFormSheet | Todos os pipelines |
| `organizations-select` | DealFormSheet | Duplicado! |
| `people-select` | DealFormSheet | **Todas as 990+ pessoas** |

### 3. Erro no useMergeBackups

O console mostra: `Query data cannot be undefined`

```
Error: Query data cannot be undefined.
Affected query key: ["merge-backups","0d892c1c-...","person"]
```

O hook retorna `undefined` quando nao encontra backup, mas React Query exige retorno de valor definido.

## Solucao

### Correcao 1: useMergeBackups - Retornar null em vez de undefined

**Arquivo**: `src/hooks/useMergeBackups.ts`

```typescript
// ANTES (linha 47)
return data?.[0] as unknown as MergeBackup | undefined;

// DEPOIS
return (data?.[0] ?? null) as unknown as MergeBackup | null;
```

### Correcao 2: ActivityFormSheet - Adicionar `enabled: open` nas queries

**Arquivo**: `src/components/activities/ActivityFormSheet.tsx`

Adicionar `enabled: open` em cada query para que so execute quando o sheet estiver aberto:

```typescript
// Query de deals (linha 151-162)
const { data: deals } = useQuery({
  queryKey: ['deals-select'],
  queryFn: async () => { ... },
  enabled: open, // ADICIONAR
});

// Query de people (linha 165-175)
const { data: people } = useQuery({
  queryKey: ['people-select'],
  queryFn: async () => { ... },
  enabled: open, // ADICIONAR
});

// Query de organizations (linha 178-188)
const { data: organizations } = useQuery({
  queryKey: ['organizations-select'],
  queryFn: async () => { ... },
  enabled: open, // ADICIONAR
});
```

### Correcao 3: DealFormSheet - Adicionar `enabled: open` nas queries base

**Arquivo**: `src/components/deals/DealFormSheet.tsx`

```typescript
// Query de pipelines (linha 181-191)
const { data: pipelines = [] } = useQuery({
  queryKey: ['pipelines-select'],
  queryFn: async () => { ... },
  enabled: open, // ADICIONAR
});

// Query de organizations (linha 244-254)
const { data: organizations = [] } = useQuery({
  queryKey: ['organizations-select'],
  queryFn: async () => { ... },
  enabled: open, // ADICIONAR
});

// Query de people (linha 258-269)
const { data: people = [] } = useQuery({
  queryKey: ['people-select', selectedOrgId],
  queryFn: async () => { ... },
  enabled: open, // MODIFICAR para: enabled: open
});
```

### Correcao 4: PersonForm - Adicionar `enabled` baseado no sheet

**Arquivo**: `src/components/people/PersonForm.tsx`

Como PersonForm e renderizado dentro de PersonFormSheet, precisamos passar uma prop ou usar contexto. A forma mais simples:

```typescript
// Query de organizations (linhas 132-142)
const { data: organizations } = useQuery({
  queryKey: ['organizations-select'],
  queryFn: async () => { ... },
  staleTime: 5 * 60 * 1000, // Cache por 5 minutos para evitar refetch
});
```

### Correcao 5: PersonDetails - Lazy loading das queries de pipeline

**Arquivo**: `src/pages/PersonDetails.tsx`

Mover as queries de `default-pipeline` e `stages` para dentro de `DealFormSheet`, ja que so sao usadas la:

```typescript
// REMOVER estas queries de PersonDetails (linhas 112-147):
// - default-pipeline query
// - stages query

// O DealFormSheet ja tem acesso a pipelines/stages via suas proprias queries
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useMergeBackups.ts` | Retornar null em vez de undefined |
| `src/components/activities/ActivityFormSheet.tsx` | Adicionar `enabled: open` em 3 queries |
| `src/components/deals/DealFormSheet.tsx` | Adicionar `enabled: open` em 3 queries |
| `src/pages/PersonDetails.tsx` | Remover queries de pipeline/stages desnecessarias |

## Impacto Esperado

- **Reducao de ~8 queries** na carga inicial da pagina
- **Eliminacao do erro de React Query** (undefined data)
- **Carregamento 50-70% mais rapido** ao clicar em contatos

## Detalhes Tecnicos

### Quantidade de Queries Antes vs Depois

| Momento | Antes | Depois |
|---------|-------|--------|
| Carga inicial | 15+ queries | 8 queries |
| Abrir ActivityFormSheet | 0 queries (ja carregadas) | 3 queries (on-demand) |
| Abrir DealFormSheet | 0 queries (ja carregadas) | 3 queries (on-demand) |

### Estrategia de Cache

As queries com `enabled: open` usarao o cache do React Query quando o sheet for reaberto, entao o delay sera minimo apos a primeira abertura.
