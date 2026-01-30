

# Etiquetas para Pessoas

## Objetivo

Criar um sistema completo de etiquetas (tags) para Pessoas, permitindo categorizar contatos com multiplas etiquetas coloridas, similar ao Pipedrive.

---

## Arquitetura do Sistema

O sistema sera composto por:

1. **Tabela `person_tags`** - armazena as etiquetas disponiveis
2. **Tabela `person_tag_assignments`** - relacionamento N:N entre pessoas e tags
3. **Componente `PersonTagsSelector`** - UI para selecionar/criar etiquetas
4. **Exibicao nas listagens e detalhes**

---

## Estrutura do Banco de Dados

### Tabela: person_tags

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| name | VARCHAR(100) | Nome da etiqueta (unico) |
| color | VARCHAR(20) | Cor (hex ou nome: red, green, blue, etc) |
| created_at | TIMESTAMP | Data de criacao |
| created_by | UUID | Usuario que criou |

### Tabela: person_tag_assignments

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| person_id | UUID | FK para people |
| tag_id | UUID | FK para person_tags |
| created_at | TIMESTAMP | Data de atribuicao |

---

## Componentes UI

### 1. PersonTagsSelector

Componente com popover que permite:
- Buscar etiquetas existentes
- Selecionar/deselecionar multiplas
- Criar nova etiqueta inline
- Visualizar etiquetas selecionadas como badges coloridos

### 2. PersonTagBadge

Badge individual com cor personalizada para exibir uma etiqueta.

### 3. Integracao nos Formularios e Detalhes

- **PersonForm.tsx**: Adicionar campo de etiquetas
- **PersonSidebar.tsx**: Exibir etiquetas atribuidas
- **PeopleTable.tsx**: Coluna de etiquetas com badges

---

## Cores Disponiveis

Paleta pre-definida para facilitar a selecao:

| Nome | Cor | Uso Sugerido |
|------|-----|--------------|
| Vermelho | #ef4444 | Urgente/Hot |
| Laranja | #f97316 | Atencao |
| Amarelo | #eab308 | Pendente |
| Verde | #22c55e | Confirmado |
| Azul | #3b82f6 | Informativo |
| Roxo | #8b5cf6 | VIP |
| Rosa | #ec4899 | Marketing |
| Cinza | #6b7280 | Neutro |

---

## Fluxo de Uso

```text
Usuario abre formulario de Pessoa
        |
        v
Clica no campo "Etiquetas"
        |
        v
Popover abre com:
- Campo de busca
- Lista de etiquetas existentes
- Opcao "+ Adicionar etiqueta"
        |
        v
Seleciona etiquetas (checkbox)
        |
        v
Badges aparecem no campo
        |
        v
Ao salvar, grava em person_tag_assignments
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Migration SQL | Criar | Tabelas person_tags e person_tag_assignments |
| `src/components/people/PersonTagsSelector.tsx` | Criar | Componente de selecao de tags |
| `src/components/people/PersonTagBadge.tsx` | Criar | Badge colorido individual |
| `src/components/people/PersonForm.tsx` | Modificar | Adicionar campo de etiquetas |
| `src/components/people/detail/PersonSidebar.tsx` | Modificar | Exibir etiquetas |
| `src/components/people/PeopleTable.tsx` | Modificar | Coluna de etiquetas |
| `src/hooks/usePersonTags.ts` | Criar | Hook para CRUD de tags |

---

## Secao Tecnica

### Migration SQL

```sql
-- Tabela de etiquetas
CREATE TABLE person_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de relacionamento
CREATE TABLE person_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES person_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(person_id, tag_id)
);

-- Indices
CREATE INDEX idx_person_tag_assignments_person ON person_tag_assignments(person_id);
CREATE INDEX idx_person_tag_assignments_tag ON person_tag_assignments(tag_id);

-- RLS
ALTER TABLE person_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all tags" ON person_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags" ON person_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage tag assignments" ON person_tag_assignments FOR ALL USING (auth.uid() IS NOT NULL);
```

### Hook usePersonTags

```typescript
// Funcoes principais:
// - usePersonTags(): lista todas as tags
// - usePersonTagAssignments(personId): tags de uma pessoa
// - createTag(name, color): criar nova tag
// - assignTag(personId, tagId): atribuir tag
// - removeTag(personId, tagId): remover tag
```

### PersonTagsSelector Component

```typescript
// Props:
// - personId?: string (para edicao)
// - selectedTags: string[] (IDs das tags selecionadas)
// - onTagsChange: (tagIds: string[]) => void

// Features:
// - Popover com Command (cmdk) para busca
// - Lista de checkboxes para selecao multipla
// - Formulario inline para criar nova tag
// - Picker de cor simplificado
```

---

## Notas sobre o Campo Label Existente

O campo `label` atual (Quente/Morno/Frio) sera mantido como "Status/Temperatura" para compatibilidade. As etiquetas sao um sistema complementar e mais flexivel.

