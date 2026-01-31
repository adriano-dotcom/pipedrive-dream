

# Adicionar Botao para Definir Contato Principal na Tabela de Organizacoes

## Objetivo

Adicionar um botao de acao rapida na tabela de organizacoes que permite transformar contatos vinculados (fallback) em contatos principais oficiais, diretamente da listagem.

---

## Interface do Usuario

O botao aparecera apenas quando o contato exibido for um fallback (vinculado), ao lado do nome do contato:

```text
Tabela Desktop:
┌───────────────────────────────────────────────────────────────────┐
│ Nome           │ Contato Principal            │ Acoes           │
├───────────────────────────────────────────────────────────────────┤
│ CATEDRAL       │ Hamilton (vinculado) [★]    │ [✏️] [🗑️]       │
│ PRAGON         │ Fernando (vinculado) [★]    │ [✏️] [🗑️]       │
│ EMPRESA X      │ Maria                        │ [✏️] [🗑️]       │
└───────────────────────────────────────────────────────────────────┘

Legenda: [★] = Botao "Definir como Principal" (tooltip)
```

Mobile:
```text
┌─────────────────────────────────────────┐
│ CATEDRAL                                │
│ Contato Vinculado                       │
│ Hamilton (vinculado)  [Tornar Principal]│
│ [Editar]              [🗑️]              │
└─────────────────────────────────────────┘
```

---

## Arquitetura da Solucao

### Fluxo de Dados

```text
Usuario clica em "Definir como Principal"
        │
        v
Mutation atualiza organizations.primary_contact_id
        │
        v
Invalida query ['organizations']
        │
        v
Tabela re-renderiza (agora sem indicador de fallback)
        │
        v
Toast de sucesso
```

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/Organizations.tsx` | Adicionar callback `onSetPrimaryContact` e mutation |
| `src/components/organizations/OrganizationsTable.tsx` | Adicionar botao na coluna contact_name, receber callback |
| `src/components/organizations/OrganizationsMobileList.tsx` | Adicionar botao no card de contato vinculado |

---

## Secao Tecnica

### 1. Organizations.tsx - Mutation para Atualizar Contato Principal

Adicionar uma nova mutation:

```typescript
const setPrimaryContactMutation = useMutation({
  mutationFn: async ({ orgId, contactId }: { orgId: string; contactId: string }) => {
    const { error } = await supabase
      .from('organizations')
      .update({ primary_contact_id: contactId })
      .eq('id', orgId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
    toast.success('Contato principal definido com sucesso!');
  },
  onError: (error) => {
    toast.error('Erro ao definir contato principal: ' + error.message);
  },
});

const handleSetPrimaryContact = (orgId: string, contactId: string) => {
  setPrimaryContactMutation.mutate({ orgId, contactId });
};
```

Passar callback para os componentes:

```typescript
<OrganizationsTable
  organizations={filteredOrganizations}
  isAdmin={isAdmin}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onSetPrimaryContact={handleSetPrimaryContact}
  isSettingPrimaryContact={setPrimaryContactMutation.isPending}
/>
```

### 2. OrganizationsTable.tsx - Botao na Coluna de Contato

Atualizar a interface para receber novos props:

```typescript
interface OrganizationsTableProps {
  organizations: OrganizationWithContact[];
  isAdmin: boolean;
  onEdit: (org: OrganizationWithContact) => void;
  onDelete: (org: OrganizationWithContact) => void;
  onSetPrimaryContact?: (orgId: string, contactId: string) => void;
  isSettingPrimaryContact?: boolean;
}
```

Atualizar a celula `contact_name` para incluir o botao:

```typescript
{
  id: 'contact_name',
  cell: ({ row }) => {
    const { primary_contact, is_fallback_contact, fallback_contact_id, id: orgId } = row.original;
    
    if (!primary_contact) return <span>-</span>;
    
    if (is_fallback_contact && fallback_contact_id && onSetPrimaryContact) {
      return (
        <div className="flex items-center gap-1">
          <Link ...>{primary_contact.name} (vinculado)</Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onSetPrimaryContact(orgId, fallback_contact_id)}
                disabled={isSettingPrimaryContact}
              >
                <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-amber-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Definir como contato principal</TooltipContent>
          </Tooltip>
        </div>
      );
    }
    
    return <Link ...>{primary_contact.name}</Link>;
  },
}
```

Imports necessarios:
- `Star` do lucide-react
- `Tooltip`, `TooltipTrigger`, `TooltipContent` do ui/tooltip
- `TooltipProvider` wrapper no componente

### 3. OrganizationsMobileList.tsx - Botao no Card Mobile

Atualizar interface:

```typescript
interface OrganizationsMobileListProps {
  organizations: OrganizationWithContact[];
  isAdmin: boolean;
  onEdit: (org: OrganizationWithContact) => void;
  onDelete: (org: OrganizationWithContact) => void;
  onSetPrimaryContact?: (orgId: string, contactId: string) => void;
  isSettingPrimaryContact?: boolean;
}
```

Adicionar botao no card de contato vinculado:

```typescript
{org.primary_contact && (
  <div className="bg-muted/30 rounded-lg p-2.5 space-y-1">
    <div className="flex items-center justify-between">
      <div className="text-xs font-medium text-muted-foreground">
        {org.is_fallback_contact ? 'Contato Vinculado' : 'Contato Principal'}
      </div>
      {org.is_fallback_contact && org.fallback_contact_id && onSetPrimaryContact && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-amber-500"
          onClick={() => onSetPrimaryContact(org.id, org.fallback_contact_id!)}
          disabled={isSettingPrimaryContact}
        >
          <Star className="h-3 w-3 mr-1" />
          Tornar Principal
        </Button>
      )}
    </div>
    ...
  </div>
)}
```

---

## Resumo das Mudancas

1. **Organizations.tsx**: Adicionar mutation `setPrimaryContactMutation` e callback `handleSetPrimaryContact`
2. **OrganizationsTable.tsx**: Adicionar botao com icone de estrela na coluna de contato para organizacoes com fallback
3. **OrganizationsMobileList.tsx**: Adicionar botao "Tornar Principal" no card de contato vinculado

---

## Comportamento Esperado

| Cenario | Antes | Depois |
|---------|-------|--------|
| CATEDRAL com Hamilton (fallback) | `Hamilton (vinculado)` | `Hamilton (vinculado) [★]` |
| Usuario clica em [★] | - | Atualiza DB, remove indicador (vinculado) |
| EMPRESA X com Maria (principal) | `Maria` | `Maria` (sem botao) |

