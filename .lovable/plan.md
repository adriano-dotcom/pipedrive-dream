

# Adicionar Filtro por Cidade nos Contatos

## O que sera feito
Adicionar um novo filtro "Cidade" no painel de filtros avancados da pagina de Pessoas. A cidade vem da organizacao vinculada ao contato (campo `organizations.address_city`).

## Alteracoes

### 1. `src/components/people/PeopleFilters.tsx`
- Adicionar `cities: string[]` ao `PeopleFiltersState` e ao `defaultPeopleFilters`
- Buscar cidades unicas do banco via query nas organizacoes (`SELECT DISTINCT address_city`)
- Adicionar o seletor de cidade na grid de filtros (com checkbox multi-select, igual aos outros filtros)
- Adicionar badge removivel de cidade quando filtro colapsado
- Incrementar contador de filtros ativos

### 2. `src/pages/People.tsx`
- Aplicar filtro server-side: quando cidades selecionadas, buscar os `organization_id`s dessas cidades e filtrar com `.in('organization_id', orgIds)`
- Adicionar `cities` na verificacao de `hasActiveFilters`

## Secao Tecnica

### Tipo atualizado:
```typescript
export interface PeopleFiltersState {
  labels: string[];
  leadSources: string[];
  jobTitles: string[];
  cities: string[];          // NOVO
  organizationId: string | null;
  ownerId: string | null;
  dateRange: { from: Date | null; to: Date | null };
  hasEmail: boolean | null;
  hasPhone: boolean | null;
}
```

### Query de cidades (dentro do PeopleFilters):
```typescript
const { data: uniqueCities = [] } = useQuery({
  queryKey: ['unique-cities'],
  queryFn: async () => {
    const { data } = await supabase
      .from('organizations')
      .select('address_city')
      .not('address_city', 'is', null)
      .order('address_city');
    return [...new Set(data?.map(o => o.address_city).filter(Boolean))];
  },
});
```

### Filtro server-side em People.tsx:
```typescript
if (advancedFilters.cities.length > 0) {
  // Buscar org IDs das cidades selecionadas
  const { data: cityOrgs } = await supabase
    .from('organizations')
    .select('id')
    .in('address_city', advancedFilters.cities);
  if (cityOrgs && cityOrgs.length > 0) {
    query = query.in('organization_id', cityOrgs.map(o => o.id));
  } else {
    return { data: [], count: 0 };
  }
}
```

### Arquivos modificados:
- `src/components/people/PeopleFilters.tsx`
- `src/pages/People.tsx`

Nenhuma migracao SQL necessaria.
