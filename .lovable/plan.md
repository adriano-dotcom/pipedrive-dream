
# Validacao antes de Excluir Pessoa

## Objetivo

Antes de excluir uma pessoa permanentemente, verificar se ela possui negocios ou atividades vinculadas e informar o usuario com opcoes claras de como prosseguir.

---

## Comportamento Proposto

### Cenario 1: Pessoa SEM vinculos
- Dialog padrao de confirmacao de exclusao
- Usuario confirma e pessoa e excluida

### Cenario 2: Pessoa COM negocios/atividades
- Dialog mostra aviso com detalhes dos vinculos
- Exemplo: "Esta pessoa possui 3 negocios e 5 atividades vinculadas"
- Usuario e informado que esses registros ficarao orfaos
- Duas opcoes: "Cancelar" ou "Excluir mesmo assim"

---

## Fluxo Visual

```text
Usuario clica no icone de lixeira
              |
              v
    Buscar vinculos da pessoa
    (deals + activities count)
              |
              v
    ┌─────────────────────────┐
    │  Possui vinculos?       │
    └─────────────────────────┘
        |             |
        Sim           Nao
        |             |
        v             v
    Dialog com     Dialog simples
    detalhes       de confirmacao
```

---

## Interface do Dialog com Vinculos

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Atenção: Esta pessoa possui vínculos                         │
│                                                                  │
│  "Wilson Teste" está vinculado a:                                │
│                                                                  │
│    • 3 negócios                                                  │
│    • 5 atividades                                                │
│                                                                  │
│  Ao excluir, esses registros perderão a referência a esta       │
│  pessoa. Esta ação não pode ser desfeita.                        │
│                                                                  │
│                    [Cancelar]  [Excluir mesmo assim]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/shared/DeleteConfirmDialog.tsx` | Adicionar props para exibir info de vinculos |
| `src/components/organizations/ContactPersonSection.tsx` | Buscar vinculos antes de abrir dialog |
| `src/components/organizations/detail/OrganizationSidebar.tsx` | Buscar vinculos antes de abrir dialog |

---

## Detalhes Tecnicos

### 1. Estender DeleteConfirmDialog.tsx

Adicionar novas props opcionais para mostrar informacoes de vinculos:

```typescript
interface DeleteConfirmDialogProps {
  // ... props existentes
  linkedInfo?: {
    deals: number;
    activities: number;
  };
}
```

Quando `linkedInfo` estiver presente e tiver valores > 0, mostrar a lista de vinculos no dialog.

### 2. Modificar ContactPersonSection.tsx

Antes de abrir o dialog de exclusao, buscar contagem de vinculos:

```typescript
const handleDelete = async (person: Person) => {
  // Buscar contagens em paralelo
  const [dealsResult, activitiesResult] = await Promise.all([
    supabase.from('deals').select('id', { count: 'exact', head: true })
      .eq('person_id', person.id),
    supabase.from('activities').select('id', { count: 'exact', head: true })
      .eq('person_id', person.id),
  ]);
  
  // Guardar pessoa e vinculos no estado
  setDeletingPerson(person);
  setLinkedInfo({
    deals: dealsResult.count || 0,
    activities: activitiesResult.count || 0,
  });
};
```

### 3. Modificar OrganizationSidebar.tsx

Mesmo padrao - buscar vinculos antes de abrir dialog:

```typescript
const handleOpenDeleteDialog = async (person: OrganizationPerson) => {
  const [dealsResult, activitiesResult] = await Promise.all([
    supabase.from('deals').select('id', { count: 'exact', head: true })
      .eq('person_id', person.id),
    supabase.from('activities').select('id', { count: 'exact', head: true })
      .eq('person_id', person.id),
  ]);
  
  setDeletingPerson(person);
  setPersonLinkedInfo({
    deals: dealsResult.count || 0,
    activities: activitiesResult.count || 0,
  });
};
```

---

## Estrutura do Estado

```typescript
// Estado adicional nos componentes
const [linkedInfo, setLinkedInfo] = useState<{
  deals: number;
  activities: number;
} | null>(null);

const [isCheckingLinks, setIsCheckingLinks] = useState(false);
```

---

## Estados de Loading

1. Ao clicar no botao de excluir, mostrar loading enquanto busca vinculos
2. Apos busca, abrir dialog com informacoes
3. Durante exclusao, mostrar loading no botao "Excluir"

---

## Texto do Dialog por Cenario

### Sem vinculos:
> Tem certeza que deseja excluir "Wilson Teste" permanentemente? Esta ação não pode ser desfeita.

### Com vinculos:
> **Atenção: Esta pessoa possui vínculos**
>
> "Wilson Teste" está vinculado a:
> - 3 negócios
> - 5 atividades
>
> Ao excluir, esses registros perderão a referência a esta pessoa e ficarão sem pessoa de contato vinculada. Esta ação não pode ser desfeita.

---

## Resumo de Implementacao

1. **DeleteConfirmDialog.tsx**: Adicionar prop `linkedInfo` para mostrar lista de vinculos
2. **ContactPersonSection.tsx**: Buscar deals/activities count antes de abrir dialog
3. **OrganizationSidebar.tsx**: Buscar deals/activities count antes de abrir dialog
4. Adicionar estado `isCheckingLinks` para loading durante busca
5. Ajustar texto do botao de confirmacao quando houver vinculos
