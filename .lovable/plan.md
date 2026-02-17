

# Implementar Soft Delete nas Tabelas Organizations, People e Deals

## Objetivo
Substituir a exclusao permanente (hard delete) por exclusao logica (soft delete) com um campo `deleted_at` nas tres tabelas principais: `organizations`, `people` e `deals`. Registros excluidos poderao ser recuperados futuramente.

## O que muda para o usuario
- Ao excluir um registro, ele deixa de aparecer nas listagens e buscas, mas continua no banco de dados
- Os registros excluidos podem ser restaurados no futuro (a interface de "lixeira" pode ser adicionada em um proximo passo)
- As mensagens de confirmacao permanecem iguais

## Etapas

### 1. Migration SQL
Adicionar coluna `deleted_at` (nullable, timestamp) nas tres tabelas e criar uma view/filtro RLS para esconder registros excluidos automaticamente:

```sql
-- Adicionar coluna deleted_at
ALTER TABLE public.organizations ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.people ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.deals ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Criar indices para performance (queries filtram por deleted_at IS NULL)
CREATE INDEX idx_organizations_deleted_at ON public.organizations (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_people_deleted_at ON public.people (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_deleted_at ON public.deals (deleted_at) WHERE deleted_at IS NULL;
```

### 2. Alterar as mutations de exclusao (`.delete()` -> `.update({ deleted_at })`)
Substituir todas as chamadas `.delete()` por `.update({ deleted_at: new Date().toISOString() })` nos seguintes arquivos:

- **src/pages/Organizations.tsx** (linhas 325-329 e 362-369) - `deleteMutation` e `bulkDeleteMutation`
- **src/pages/People.tsx** (linhas 255-259 e 271-274) - `deleteMutation` e `bulkDeleteMutation`
- **src/pages/DealDetails.tsx** (linhas 97-103) - `deleteDealMutation`
- **src/components/deals/DealFormSheet.tsx** (linhas 415-418) - `deleteMutation`
- **src/components/organizations/ContactPersonSection.tsx** (linhas 89-96) - `deleteMutation` de pessoa

### 3. Adicionar filtro `.is('deleted_at', null)` em todas as queries SELECT
Para que registros "excluidos" nao aparecam, adicionar o filtro em todas as queries que listam essas entidades:

**Organizations:**
- `src/pages/Organizations.tsx` - query principal de listagem (apos o `.select()`)
- `src/pages/Dashboard.tsx` - contagem de organizacoes
- `src/components/layout/GlobalSearch.tsx` - busca global de organizacoes
- `src/components/deals/DealFormSheet.tsx` - select de organizacoes no formulario de deal
- `src/hooks/useOrganizationDetails.ts` - detalhe da organizacao

**People:**
- `src/pages/People.tsx` - query principal de listagem
- `src/pages/Dashboard.tsx` - contagem de pessoas
- `src/components/layout/GlobalSearch.tsx` - busca global de pessoas
- `src/components/deals/DealFormSheet.tsx` - select de pessoas no formulario de deal
- `src/components/organizations/ContactPersonSection.tsx` - listagem de contatos da organizacao
- `src/hooks/usePersonDetails.ts` - detalhe da pessoa
- `src/components/shared/RecordNavigation.tsx` - navegacao entre registros

**Deals:**
- `src/components/deals/KanbanBoard.tsx` - kanban de deals
- `src/components/deals/DealsListView.tsx` - listagem de deals
- `src/pages/Deals.tsx` - contagem de deals por pipeline
- `src/pages/Dashboard.tsx` - contagem de deals
- `src/components/layout/GlobalSearch.tsx` - busca global de deals
- `src/hooks/useDealDetails.ts` - detalhe do deal
- `src/hooks/usePersonDetails.ts` - deals de uma pessoa
- `src/components/shared/RecordNavigation.tsx` - navegacao entre registros
- `src/components/activities/ActivityFormSheet.tsx` - select de deals no formulario de atividade

### 4. Manter as mensagens de sucesso iguais
As toasts de sucesso continuam dizendo "excluido com sucesso" para manter a experiencia do usuario consistente.

## Secao Tecnica

### Abordagem
- Soft delete via coluna `deleted_at` (NULL = ativo, timestamp = excluido)
- Indices parciais (`WHERE deleted_at IS NULL`) para que queries normais mantenham a mesma performance
- Nao vamos alterar as politicas RLS existentes -- o filtro sera aplicado no nivel da aplicacao via `.is('deleted_at', null)` em cada query
- A coluna `deleted_at` sera nullable por padrao (NULL = registro ativo)

### Por que nao usar RLS para filtrar?
- RLS com filtro `deleted_at IS NULL` impediria a futura funcionalidade de "lixeira" (listar excluidos para restauracao)
- Manter o filtro no codigo da maior flexibilidade

### Arquivos modificados (estimativa: ~15 arquivos)
- 1 migration SQL
- ~10 arquivos com queries SELECT (adicionar `.is('deleted_at', null)`)
- ~5 arquivos com mutations de delete (trocar `.delete()` por `.update()`)

### Riscos e mitigacoes
- **Dados orfaos**: Deals e atividades vinculados a pessoas/organizacoes soft-deleted continuam existindo. O filtro `deleted_at` nao se propaga automaticamente. Isso e intencional -- os deals mantem seus vinculos e podem ser acessados independentemente.
- **Contagens**: Dashboard e contadores serao atualizados para filtrar por `deleted_at IS NULL`, garantindo consistencia.

