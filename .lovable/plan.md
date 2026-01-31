
# Adicionar Opcao de Excluir Pessoa nos Cards

## Contexto

Atualmente, os cards de pessoas exibidos na pagina de detalhes da organizacao (sidebar e formulario) possuem apenas opcoes de:
- **Editar** (icone de lapis) - abre o formulario de edicao
- **Desvincular** (icone de corrente quebrada) - remove a associacao com a organizacao, mas a pessoa permanece no sistema

O usuario deseja adicionar a opcao de **excluir** a pessoa completamente do sistema.

---

## Componentes Afetados

| Componente | Local | Estado Atual |
|------------|-------|--------------|
| `ContactPersonItem.tsx` | Cards no formulario de organizacao | Editar + Desvincular |
| `OrganizationSidebar.tsx` | Cards na pagina de detalhes | Editar + Desvincular (hover) |

---

## Plano de Implementacao

### 1. Modificar ContactPersonItem.tsx

Adicionar um novo botao de excluir e uma nova prop `onDelete`:

```typescript
interface ContactPersonItemProps {
  person: Person;
  isPrimary: boolean;
  onSetPrimary: (personId: string) => void;
  onUnlink: (personId: string) => void;
  onEdit?: (person: Person) => void;
  onDelete?: (person: Person) => void; // Nova prop
}
```

Adicionar botao com icone `Trash2` em vermelho ao lado dos outros botoes.

### 2. Modificar ContactPersonSection.tsx

Adicionar:
- Estado para controlar o dialog de confirmacao de exclusao
- Mutation para deletar a pessoa do banco de dados
- Handler `handleDelete` que abre o dialog de confirmacao
- Componente `DeleteConfirmDialog` para confirmar a exclusao
- Passar `onDelete` para cada `ContactPersonItem`

### 3. Modificar OrganizationSidebar.tsx

Adicionar:
- Estado `deletingPerson` para rastrear qual pessoa esta sendo excluida
- Estado `isDeleting` para controlar loading
- Funcao `handleDeletePerson` para executar a exclusao
- Botao de excluir (Trash2) ao lado do botao de desvincular
- Dialog de confirmacao usando `AlertDialog` existente

---

## Interface do Usuario

### Nos Cards (apos implementacao)

```
┌────────────────────────────────────────────────────────────────┐
│  WILSON TESTE 02                        ★   ✏️   🗑️   🔗       │
│  Gerente Comercial                                              │
│  📞 (11) 99999-9999  ✉️ email@email.com                        │
└────────────────────────────────────────────────────────────────┘
```

Icones (da esquerda para direita):
- ★ (Star) - Definir como contato principal
- ✏️ (Pencil) - Editar pessoa
- 🗑️ (Trash) - **NOVO** - Excluir pessoa permanentemente
- 🔗 (Unlink) - Desvincular da organizacao

### Dialog de Confirmacao

```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ Excluir Pessoa?                                             │
│                                                                  │
│  Tem certeza que deseja excluir "Wilson Teste 02"               │
│  permanentemente?                                                │
│                                                                  │
│  Esta acao nao pode ser desfeita. Todos os dados da pessoa,     │
│  incluindo atividades, notas e arquivos vinculados, serao       │
│  removidos.                                                      │
│                                                                  │
│                              [Cancelar]  [Excluir]               │
└────────────────────────────────────────────────────────────────┘
```

---

## Detalhes Tecnicos

### Ordem dos Botoes

Para manter consistencia visual e evitar cliques acidentais:
1. Definir como principal (Star)
2. Editar (Pencil)  
3. Excluir (Trash2) - vermelho/destrutivo
4. Desvincular (Unlink) - cinza/muted

### Validacoes

- Verificar se a pessoa tem negocios ou atividades vinculadas antes de excluir
- Se for contato principal, avisar que o campo sera limpo
- Usar RLS do Supabase para garantir permissoes

### Query Invalidation

Apos exclusao bem-sucedida:
- `['organization-contacts', organizationId]`
- `['organization-people', organizationId]`
- `['people']`
- `['person', personId]`

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/organizations/ContactPersonItem.tsx` | Adicionar prop `onDelete` e botao Trash2 |
| `src/components/organizations/ContactPersonSection.tsx` | Adicionar logica de exclusao, dialog e handler |
| `src/components/organizations/detail/OrganizationSidebar.tsx` | Adicionar botao e dialog de exclusao |

---

## Beneficios

- Permite excluir pessoas duplicadas ou incorretas diretamente da tela da organizacao
- Mantém consistencia com outras partes do sistema (tabela de pessoas tem opcao de excluir)
- Dialog de confirmacao previne exclusoes acidentais
- Feedback visual claro com estados de loading
