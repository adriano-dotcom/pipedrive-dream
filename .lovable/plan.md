
# Diagnóstico: Preparação do Banco para 50.000 Empresas com Contatos

## Situação Atual

| Métrica | Valor Atual |
|---------|-------------|
| Organizações | 841 |
| Pessoas (contatos) | 984 |
| Tamanho `organizations` | 664 KB |
| Tamanho `people` | 640 KB |

## Pontos Positivos (Já Implementados)

1. **Paginação Server-Side** - O hook `usePaginatedQuery` já implementa paginação no servidor com prefetch da próxima página
2. **Ordenação Server-Side** - Ordenação acontece no banco, não no frontend
3. **Debounce na busca** - 300ms de delay antes de executar queries
4. **Filtros Server-Side** - Filtros são aplicados diretamente na query SQL

## Problemas Identificados para 50.000 Registros

### 1. Falta de Índices Críticos

| Índice Faltando | Impacto |
|-----------------|---------|
| `created_at DESC` em organizations/people | Ordenação padrão faz Seq Scan |
| `address_city`, `address_state` | Filtros de cidade/estado sem índice |
| `label` em organizations | Filtro de classificação sem índice |
| `automotores` | Ordenação por frota sem índice |
| `policy_renewal_month` | Filtro de mês de renovação sem índice |

### 2. Busca ILIKE Não Otimizada

A extensão `pg_trgm` **não está habilitada**. Com 50k registros, buscas como:

```sql
WHERE name ILIKE '%termo%' OR cnpj ILIKE '%termo%'
```

Farão **Seq Scan** (varredura completa), demorando ~250-500ms por busca.

### 3. Índices GIN para Busca Textual

Não existem índices GIN para acelerar `ILIKE`. Com 50k registros, isso será gargalo.

---

## Plano de Otimização

### Fase 1: Índices B-tree para Ordenação e Filtros

```sql
-- Ordenação padrão (created_at DESC)
CREATE INDEX CONCURRENTLY idx_organizations_created_at 
  ON organizations(created_at DESC);

CREATE INDEX CONCURRENTLY idx_people_created_at 
  ON people(created_at DESC);

-- Ordenação por automotores (muito usado no CRM de seguros)
CREATE INDEX CONCURRENTLY idx_organizations_automotores 
  ON organizations(automotores DESC NULLS LAST);

-- Filtros frequentes
CREATE INDEX CONCURRENTLY idx_organizations_label 
  ON organizations(label) WHERE label IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_organizations_city 
  ON organizations(address_city) WHERE address_city IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_organizations_state 
  ON organizations(address_state) WHERE address_state IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_organizations_renewal_month 
  ON organizations(policy_renewal_month) WHERE policy_renewal_month IS NOT NULL;
```

### Fase 2: Índices GIN para Busca Textual

```sql
-- Habilitar extensão para buscas ILIKE performáticas
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para busca textual em organizations
CREATE INDEX CONCURRENTLY idx_organizations_name_gin 
  ON organizations USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_organizations_cnpj_gin 
  ON organizations USING gin (cnpj gin_trgm_ops);

-- Índice GIN para busca textual em people
CREATE INDEX CONCURRENTLY idx_people_name_gin 
  ON people USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_people_phone_gin 
  ON people USING gin (phone gin_trgm_ops);
```

### Fase 3: Índice Composto para Query Principal

```sql
-- Índice composto para a query mais comum (listagem paginada)
CREATE INDEX CONCURRENTLY idx_organizations_list 
  ON organizations(created_at DESC, id);
```

---

## Comparativo de Performance Estimada

| Operação | Sem Índices (50k) | Com Índices (50k) |
|----------|-------------------|-------------------|
| Listagem paginada | ~500ms | ~10ms |
| Busca ILIKE | ~300ms | ~20ms |
| Filtro por cidade | ~200ms | ~5ms |
| Ordenar por automotores | ~400ms | ~15ms |

---

## Detalhes Técnicos da Migração

A migration SQL completa incluirá:

1. **Criar extensão `pg_trgm`** - Necessária para índices GIN
2. **Índices B-tree** para ordenação e filtros com `WHERE` parcial
3. **Índices GIN** para colunas de busca textual
4. **Índice composto** para a query principal de listagem

Todos os índices usam `CREATE INDEX CONCURRENTLY` para não bloquear operações durante a criação (pode levar alguns minutos com 50k registros).

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migration SQL | Criar ~12 índices otimizados |

A implementação frontend já está preparada (paginação server-side, ordenação server-side). Apenas os índices do banco precisam ser adicionados.
