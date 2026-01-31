
# Sistema de Filtros Avancados para Organizacoes e Pessoas

## Situacao Atual

O sistema ja possui:
- Busca por texto (nome, email, telefone, CNPJ)
- Filtro por etiquetas (tags) via TagFilterPopover
- Persistencia de etiquetas selecionadas no localStorage
- Padrao de filtros avancados implementado em KanbanFilters para negocios

---

## Proposta: Adicionar Filtros Avancados

Criar um sistema de filtros similar ao existente em Deals (KanbanFilters), adaptado para cada entidade.

---

## Campos Disponiveis para Filtro

### Pessoas (People)

| Campo | Tipo de Filtro | Opcoes |
|-------|----------------|--------|
| Status (label) | Multi-selecao | Quente, Morno, Frio |
| Origem do Lead | Multi-selecao | Lista de origens unicas |
| Cargo | Multi-selecao | Lista de cargos unicos |
| Organizacao | Selecao unica | Lista de organizacoes |
| Responsavel | Selecao unica | Lista de usuarios |
| Etiquetas | Multi-selecao | Ja implementado |
| Periodo (criacao) | Range de datas | De/Ate |
| Tem Email | Boolean | Sim/Nao |
| Tem Telefone | Boolean | Sim/Nao |

### Organizacoes (Organizations)

| Campo | Tipo de Filtro | Opcoes |
|-------|----------------|--------|
| Status (label) | Multi-selecao | Quente, Morno, Frio |
| Cidade | Multi-selecao | Lista de cidades unicas |
| Estado | Multi-selecao | Lista de estados |
| Ramos de Seguro | Multi-selecao | Carga, Saude, Frota, etc |
| Seguradora Atual | Multi-selecao | Lista de seguradoras |
| Perfil de Risco | Multi-selecao | Baixo, Medio, Alto |
| Tipo de Frota | Multi-selecao | Lista unica |
| Mes de Renovacao | Multi-selecao | Janeiro-Dezembro |
| Responsavel | Selecao unica | Lista de usuarios |
| Etiquetas | Multi-selecao | Ja implementado |
| Periodo (criacao) | Range de datas | De/Ate |
| Tem CNPJ | Boolean | Sim/Nao |
| Historico de Sinistros | Boolean | Sim/Nao |

---

## Arquitetura de Componentes

```text
src/components/shared/
├── AdvancedFilters.tsx          # Componente base reutilizavel
├── FilterSection.tsx            # Secao individual de filtro
├── MultiSelectFilter.tsx        # Filtro multi-selecao
├── DateRangeFilter.tsx          # Filtro de periodo
└── BooleanFilter.tsx            # Filtro sim/nao

src/components/people/
└── PeopleFilters.tsx            # Configuracao de filtros para pessoas

src/components/organizations/
└── OrganizationsFilters.tsx     # Configuracao de filtros para organizacoes
```

---

## Arquivos a Criar/Modificar

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/components/shared/AdvancedFilters.tsx` | Criar | Componente colapsivel de filtros |
| `src/components/people/PeopleFilters.tsx` | Criar | Filtros especificos para pessoas |
| `src/components/organizations/OrganizationsFilters.tsx` | Criar | Filtros especificos para organizacoes |
| `src/pages/People.tsx` | Modificar | Integrar PeopleFilters |
| `src/pages/Organizations.tsx` | Modificar | Integrar OrganizationsFilters |

---

## Interface de Usuario

Similar ao KanbanFilters, com painel colapsivel:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [🔍 Buscar...]                    [🏷 Etiquetas ▾] [⚙ Filtros (3) ▾] │
└─────────────────────────────────────────────────────────────────────┘
                              ▼ (ao expandir)
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│ │ Status      │ │ Cidade      │ │ Responsavel │ │ Periodo         │ │
│ │ ○ Quente    │ │ □ Curitiba  │ │ ○ Todos     │ │ De: 01/01/2026  │ │
│ │ ○ Morno     │ │ □ Londrina  │ │ ○ Joao      │ │ Ate: 31/01/2026 │ │
│ │ ○ Frio      │ │ □ Maringa   │ │ ○ Maria     │ │                 │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘ │
│                                                                     │
│                                          [Limpar todos os filtros]  │
└─────────────────────────────────────────────────────────────────────┘
```

Filtros ativos aparecem como badges removiveis na barra de ferramentas.

---

## Detalhes Tecnicos

### 1. Interface de Estado dos Filtros

```typescript
// Para Pessoas
interface PeopleFiltersState {
  labels: string[];           // Quente, Morno, Frio
  leadSources: string[];      // Origens de lead
  jobTitles: string[];        // Cargos
  organizationId: string | null;
  ownerId: string | null;
  tagIds: string[];           // Ja existe
  dateRange: { from: Date | null; to: Date | null };
  hasEmail: boolean | null;
  hasPhone: boolean | null;
}

// Para Organizacoes
interface OrganizationsFiltersState {
  labels: string[];           // Quente, Morno, Frio
  cities: string[];           // Cidades
  states: string[];           // Estados
  insuranceBranches: string[];// Ramos de seguro
  currentInsurers: string[]; // Seguradoras
  riskProfiles: string[];    // Perfis de risco
  fleetTypes: string[];      // Tipos de frota
  renewalMonths: number[];   // Meses de renovacao
  ownerId: string | null;
  tagIds: string[];          // Ja existe
  dateRange: { from: Date | null; to: Date | null };
  hasCnpj: boolean | null;
  hasClaimsHistory: boolean | null;
}
```

### 2. Persistencia no localStorage

```typescript
// Chaves de armazenamento
const STORAGE_KEYS = {
  peopleFilters: 'people-advanced-filters',
  orgFilters: 'org-advanced-filters',
};

// Salvar automaticamente ao mudar
useEffect(() => {
  localStorage.setItem(STORAGE_KEYS.peopleFilters, JSON.stringify(filters));
}, [filters]);
```

### 3. Logica de Filtragem (Client-side)

```typescript
const filteredPeople = useMemo(() => {
  if (!people) return [];
  
  return people.filter(person => {
    // Filtro de labels
    if (filters.labels.length > 0 && !filters.labels.includes(person.label || '')) {
      return false;
    }
    
    // Filtro de origens
    if (filters.leadSources.length > 0 && !filters.leadSources.includes(person.lead_source || '')) {
      return false;
    }
    
    // Filtro de responsavel
    if (filters.ownerId && person.owner_id !== filters.ownerId) {
      return false;
    }
    
    // Filtro de email
    if (filters.hasEmail === true && !person.email) return false;
    if (filters.hasEmail === false && person.email) return false;
    
    // Filtro de periodo
    if (filters.dateRange.from || filters.dateRange.to) {
      const createdAt = new Date(person.created_at);
      if (filters.dateRange.from && createdAt < filters.dateRange.from) return false;
      if (filters.dateRange.to && createdAt > filters.dateRange.to) return false;
    }
    
    return true;
  });
}, [people, filters, tagAssignments]);
```

### 4. Contagem de Filtros Ativos

```typescript
const activeFiltersCount = useMemo(() => {
  return (
    filters.labels.length +
    filters.leadSources.length +
    filters.jobTitles.length +
    (filters.organizationId ? 1 : 0) +
    (filters.ownerId ? 1 : 0) +
    filters.tagIds.length +
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
    (filters.hasEmail !== null ? 1 : 0) +
    (filters.hasPhone !== null ? 1 : 0)
  );
}, [filters]);
```

---

## Fluxo de Implementacao

```text
1. Criar AdvancedFilters.tsx
   └── Componente colapsivel base

2. Criar PeopleFilters.tsx
   └── Define campos especificos para Pessoas
   └── Busca dados dinamicos (origens, cargos, etc)

3. Criar OrganizationsFilters.tsx
   └── Define campos especificos para Organizacoes
   └── Busca dados dinamicos (cidades, estados, etc)

4. Modificar People.tsx
   └── Adicionar estado de filtros
   └── Integrar PeopleFilters
   └── Aplicar logica de filtragem

5. Modificar Organizations.tsx
   └── Adicionar estado de filtros
   └── Integrar OrganizationsFilters
   └── Aplicar logica de filtragem
```

---

## Funcionalidades

1. **Multiplos filtros simultaneos**: Sim, todos os filtros podem ser combinados (AND)
2. **Persistencia**: Filtros salvos no localStorage, mantidos apos reload
3. **Badges removiveis**: Filtros ativos aparecem como badges que podem ser removidos individualmente
4. **Limpar tudo**: Botao para resetar todos os filtros
5. **Contagem visual**: Badge mostrando quantos filtros estao ativos
6. **Painel colapsivel**: Economiza espaco quando nao esta em uso
7. **Valores dinamicos**: Listas de cidades, origens, etc sao extraidas dos dados existentes

---

## Beneficios

- Interface consistente com filtros de Negocios (KanbanFilters)
- Usuarios podem encontrar rapidamente contatos/organizacoes especificas
- Filtros persistem entre sessoes
- Facil de adicionar novos campos de filtro no futuro
- Codigo reutilizavel entre entidades
