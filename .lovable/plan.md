

# Adicionar Filtro "Atualizada RF" na Listagem de Organizacoes

## O que sera feito
Adicionar um novo filtro no painel de filtros avancados de Organizacoes que permite filtrar empresas por status de atualizacao na Receita Federal (campo `last_enriched_at`). O usuario podera escolher entre: Todas, Atualizadas RF, ou Nao Atualizadas RF.

## Alteracoes

### 1. `src/components/organizations/OrganizationsFilters.tsx`
- Adicionar `enrichmentStatus` ao tipo `OrganizationsFiltersState` com valores `null | 'enriched' | 'not_enriched'`
- Adicionar valor padrao `enrichmentStatus: null` em `defaultOrganizationsFilters`
- Incluir no contador de filtros ativos
- Adicionar handler `handleEnrichmentStatusChange`
- Adicionar novo filtro na UI (similar ao "Tem CNPJ"), com icone `FileText` e opcoes: Todas / Atualizada RF / Nao Atualizada RF
- Adicionar badge removivel quando filtro ativo

### 2. `src/pages/Organizations.tsx`
- Aplicar o filtro server-side na query de busca:
  - `enriched`: `query.not('last_enriched_at', 'is', null)`
  - `not_enriched`: `query.is('last_enriched_at', null)`
- Incluir no calculo de `hasActiveFilters`

## Secao Tecnica

### Novo campo no tipo de filtros:
```typescript
export interface OrganizationsFiltersState {
  // ...campos existentes
  enrichmentStatus: 'enriched' | 'not_enriched' | null;  // NOVO
}
```

### Filtro server-side em Organizations.tsx:
```typescript
if (advancedFilters.enrichmentStatus === 'enriched') {
  query = query.not('last_enriched_at', 'is', null);
} else if (advancedFilters.enrichmentStatus === 'not_enriched') {
  query = query.is('last_enriched_at', null);
}
```

### Novo filtro na UI (mesmo padrao do "Tem CNPJ"):
```typescript
<div className="space-y-2">
  <label className="text-sm font-medium">Atualizada RF</label>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-full justify-between">
        {filters.enrichmentStatus === null
          ? 'Todas'
          : filters.enrichmentStatus === 'enriched'
          ? 'Atualizada'
          : 'Nao Atualizada'}
        <FileText className="h-4 w-4 opacity-50" />
      </Button>
    </PopoverTrigger>
    <!-- Opcoes: Todas / Atualizada / Nao Atualizada -->
  </Popover>
</div>
```

### Arquivos modificados:
- `src/components/organizations/OrganizationsFilters.tsx` - novo campo + UI do filtro
- `src/pages/Organizations.tsx` - aplicar filtro server-side + hasActiveFilters

