
# Editar e Excluir Etiquetas

## Objetivo

Adicionar a funcionalidade de editar (nome e cor) e excluir etiquetas existentes no sistema de tags de Pessoas.

---

## Funcionalidades a Implementar

### 1. Editar Etiqueta
- Alterar nome da etiqueta
- Alterar cor da etiqueta
- Validar nome duplicado
- Feedback visual ao salvar

### 2. Excluir Etiqueta
- Confirmar exclusao antes de remover
- Informar que a tag sera removida de todas as pessoas
- Feedback visual durante exclusao

---

## Interface do Usuario

O popover de etiquetas tera um botao de "Gerenciar" que abre uma nova visualizacao:

```text
┌────────────────────────────────────┐
│ Gerenciar Etiquetas          [X]  │
├────────────────────────────────────┤
│ [●] Cliente VIP     [Editar] [🗑] │
│ [●] Lead Quente     [Editar] [🗑] │
│ [●] Parceiro        [Editar] [🗑] │
│ [●] Fornecedor      [Editar] [🗑] │
├────────────────────────────────────┤
│         [+ Criar Nova]            │
└────────────────────────────────────┘

Ao clicar em Editar:
┌────────────────────────────────────┐
│ Editar Etiqueta              [X]  │
├────────────────────────────────────┤
│ Nome: [________________]          │
│ Cor:  ● ● ● ● ● ● ● ●            │
│                                   │
│     [Cancelar]  [Salvar]          │
└────────────────────────────────────┘
```

---

## Fluxo de Uso

```text
Usuario abre seletor de etiquetas
        │
        v
Clica em "Gerenciar etiquetas" (icone de engrenagem)
        │
        v
Lista de todas as etiquetas com acoes
        │
        ├── Editar → Formulario inline → Salvar
        │
        └── Excluir → Modal de confirmacao → Confirmar
```

---

## Arquivos a Modificar/Criar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/hooks/usePersonTags.ts` | Modificar | Adicionar hooks useUpdatePersonTag e useDeletePersonTag |
| `src/components/people/PersonTagsSelector.tsx` | Modificar | Adicionar modo "gerenciar" com opcoes de editar/excluir |

---

## Secao Tecnica

### Novos Hooks no usePersonTags.ts

```typescript
// Hook para atualizar uma tag existente
export function useUpdatePersonTag() {
  return useMutation({
    mutationFn: async ({ id, name, color }) => {
      const { data, error } = await supabase
        .from('person_tags')
        .update({ name, color })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-tags'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

// Hook para excluir uma tag
export function useDeletePersonTag() {
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('person_tags')
        .delete()
        .eq('id', tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-tags'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
```

### Alteracoes no PersonTagsSelector.tsx

1. **Novo estado**: `showManageView` para alternar entre selecao e gerenciamento
2. **Novo estado**: `editingTag` para armazenar a tag sendo editada
3. **Novo estado**: `tagToDelete` para armazenar a tag a ser excluida
4. **Componente de lista editavel**: Mostrar todas as tags com botoes de acao
5. **Formulario de edicao inline**: Similar ao de criacao
6. **Integracao com DeleteConfirmDialog**: Para confirmar exclusao

### Estrutura do Componente Atualizado

```typescript
// Estados adicionais
const [showManageView, setShowManageView] = useState(false);
const [editingTag, setEditingTag] = useState<PersonTag | null>(null);
const [tagToDelete, setTagToDelete] = useState<PersonTag | null>(null);

// Condicoes de renderizacao
if (showManageView && editingTag) {
  // Formulario de edicao
}
if (showManageView) {
  // Lista de tags com botoes editar/excluir
}
// else: Lista de selecao (atual)
```

---

## Consideracoes de Seguranca

As politicas RLS ja estao configuradas:
- `Admins can update tags` - Apenas admins podem editar
- `Admins can delete tags` - Apenas admins podem excluir

A UI deve mostrar os botoes de editar/excluir apenas para usuarios admin, mas o backend ja protege as operacoes.

---

## Tratamento de Erros

- **Nome duplicado**: Validar antes de salvar e mostrar mensagem
- **Exclusao em cascata**: ON DELETE CASCADE ja esta configurado para person_tag_assignments
- **Sem permissao**: Capturar erro e mostrar mensagem apropriada
