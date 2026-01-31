
# Sistema de Etiquetas para Organizações e Negócios

## Visão Geral

Implementar o sistema de etiquetas (tags) multi-seleção para as entidades **Organizações** e **Negócios**, replicando a mesma estrutura e funcionalidades já existentes em Pessoas.

---

## Arquitetura do Banco de Dados

### Novas Tabelas

| Tabela | Descrição |
|--------|-----------|
| `organization_tags` | Definição de etiquetas para organizações |
| `organization_tag_assignments` | Relacionamento N:N entre organizações e tags |
| `deal_tags` | Definição de etiquetas para negócios |
| `deal_tag_assignments` | Relacionamento N:N entre negócios e tags |

### Estrutura das Tabelas

**organization_tags / deal_tags:**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| name | VARCHAR(100) | Nome da etiqueta (único) |
| color | VARCHAR(20) | Cor em hexadecimal |
| created_at | TIMESTAMP | Data de criação |
| created_by | UUID | Usuário que criou |

**organization_tag_assignments / deal_tag_assignments:**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| organization_id / deal_id | UUID | FK para a entidade |
| tag_id | UUID | FK para tags |
| created_at | TIMESTAMP | Data de atribuição |

---

## Componentes a Criar

### 1. Hooks

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useOrganizationTags.ts` | CRUD de tags para organizações |
| `src/hooks/useDealTags.ts` | CRUD de tags para negócios |

Cada hook incluirá:
- `useOrganizationTags()` / `useDealTags()` - listar tags disponíveis
- `useOrganizationTagAssignments(id)` / `useDealTagAssignments(id)` - tags da entidade
- `useCreateOrganizationTag()` / `useCreateDealTag()` - criar nova tag
- `useAssignOrganizationTags()` / `useAssignDealTags()` - atribuir tags
- `useUpdateOrganizationTag()` / `useUpdateDealTag()` - editar tag
- `useDeleteOrganizationTag()` / `useDeleteDealTag()` - excluir tag

### 2. Componentes UI

| Arquivo | Descrição |
|---------|-----------|
| `src/components/organizations/OrganizationTagsSelector.tsx` | Seletor multi-select com popover |
| `src/components/organizations/OrganizationTagBadge.tsx` | Badge colorido |
| `src/components/deals/DealTagsSelector.tsx` | Seletor multi-select com popover |
| `src/components/deals/DealTagBadge.tsx` | Badge colorido |

Os componentes TagBadge podem reutilizar a lógica do `PersonTagBadge.tsx` ou ser um componente genérico compartilhado.

---

## Integração nas Telas

### Organizações

| Arquivo | Modificação |
|---------|-------------|
| `OrganizationForm.tsx` | Adicionar campo `OrganizationTagsSelector` |
| `OrganizationSidebar.tsx` | Exibir tags atribuídas no resumo |
| `OrganizationsTable.tsx` | Nova coluna "Etiquetas" com badges |

### Negócios

| Arquivo | Modificação |
|---------|-------------|
| `DealFormSheet.tsx` | Adicionar campo `DealTagsSelector` |
| `DealSidebar.tsx` | Exibir tags atribuídas |
| `DealsTable.tsx` | Nova coluna "Etiquetas" com badges |
| `DealCard.tsx` | Exibir tags no card do Kanban |

---

## Fluxo de Implementação

```text
1. Criar tabelas no banco de dados (SQL migration)
           |
           v
2. Criar hooks para cada entidade
           |
           v
3. Criar componentes TagBadge e TagsSelector
           |
           v
4. Integrar nos formulários (create/edit)
           |
           v
5. Exibir nas páginas de detalhes (Sidebar)
           |
           v
6. Adicionar colunas nas tabelas de listagem
```

---

## Políticas de Segurança (RLS)

Seguindo o mesmo padrão de `person_tags`:

**Para organization_tags e deal_tags:**
- SELECT: Todos usuários autenticados
- INSERT: Usuários autenticados
- UPDATE: Apenas admins
- DELETE: Apenas admins

**Para organization_tag_assignments e deal_tag_assignments:**
- SELECT: Todos usuários autenticados
- INSERT: Usuários autenticados
- DELETE: Usuários autenticados

---

## Seção Técnica

### SQL Migration

```sql
-- Organization Tags
CREATE TABLE organization_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE organization_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES organization_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, tag_id)
);

-- Deal Tags
CREATE TABLE deal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE deal_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES deal_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(deal_id, tag_id)
);

-- Indices para performance
CREATE INDEX idx_org_tag_assignments_org ON organization_tag_assignments(organization_id);
CREATE INDEX idx_org_tag_assignments_tag ON organization_tag_assignments(tag_id);
CREATE INDEX idx_deal_tag_assignments_deal ON deal_tag_assignments(deal_id);
CREATE INDEX idx_deal_tag_assignments_tag ON deal_tag_assignments(tag_id);

-- RLS
ALTER TABLE organization_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Policies para organization_tags
CREATE POLICY "Users can view all organization tags" 
  ON organization_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create organization tags" 
  ON organization_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update organization tags" 
  ON organization_tags FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete organization tags" 
  ON organization_tags FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Policies para organization_tag_assignments
CREATE POLICY "Users can view all organization tag assignments" 
  ON organization_tag_assignments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create organization tag assignments" 
  ON organization_tag_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete organization tag assignments" 
  ON organization_tag_assignments FOR DELETE USING (auth.uid() IS NOT NULL);

-- Policies para deal_tags
CREATE POLICY "Users can view all deal tags" 
  ON deal_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create deal tags" 
  ON deal_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update deal tags" 
  ON deal_tags FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete deal tags" 
  ON deal_tags FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Policies para deal_tag_assignments
CREATE POLICY "Users can view all deal tag assignments" 
  ON deal_tag_assignments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create deal tag assignments" 
  ON deal_tag_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete deal tag assignments" 
  ON deal_tag_assignments FOR DELETE USING (auth.uid() IS NOT NULL);
```

### Estrutura dos Hooks

Os hooks seguirão exatamente a mesma estrutura de `usePersonTags.ts`, adaptando:
- Nomes das tabelas
- Query keys
- Tipos de entidade

### Estrutura dos Componentes

Os componentes TagsSelector serão baseados em `PersonTagsSelector.tsx`:
- Mesma estrutura de Popover com Command
- ViewMode: select, create, manage, edit
- Integração com DeleteConfirmDialog
- Cores pré-definidas (TAG_COLORS)

Os componentes TagBadge podem ser generalizados ou reutilizados diretamente do PersonTagBadge.

---

## Arquivos a Criar/Modificar

| Tipo | Arquivo | Ação |
|------|---------|------|
| Migration | `supabase/migrations/[timestamp].sql` | Criar |
| Hook | `src/hooks/useOrganizationTags.ts` | Criar |
| Hook | `src/hooks/useDealTags.ts` | Criar |
| Componente | `src/components/organizations/OrganizationTagsSelector.tsx` | Criar |
| Componente | `src/components/organizations/OrganizationTagBadge.tsx` | Criar |
| Componente | `src/components/deals/DealTagsSelector.tsx` | Criar |
| Componente | `src/components/deals/DealTagBadge.tsx` | Criar |
| Form | `src/components/organizations/OrganizationForm.tsx` | Modificar |
| Form | `src/components/deals/DealFormSheet.tsx` | Modificar |
| Sidebar | `src/components/organizations/detail/OrganizationSidebar.tsx` | Modificar |
| Sidebar | `src/components/deals/detail/DealSidebar.tsx` | Modificar |
| Tabela | `src/components/organizations/OrganizationsTable.tsx` | Modificar |
| Tabela | `src/components/deals/DealsTable.tsx` | Modificar |

---

## Considerações

1. **Consistência Visual**: Usar as mesmas cores e estilos de badges em todas as entidades
2. **Performance**: Bulk loading de tags nas listagens para evitar N+1 queries
3. **Reutilização**: Considerar criar componentes genéricos para reduzir duplicação
4. **UX**: Manter a mesma experiência de uso em todas as entidades (Popover, busca, criar inline, gerenciar)

