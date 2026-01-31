
# Exibir Contato na Coluna Mesmo Sem Contato Principal Definido

## Problema

A coluna "Contato Principal" na tabela de organizações está vazia mesmo quando existem pessoas vinculadas à organização. Isso ocorre porque:

1. A query atual busca apenas `primary_contact:people!primary_contact_id(...)` - ou seja, só quando `primary_contact_id` está preenchido
2. Organizações como CATEDRAL e PRAGON têm pessoas vinculadas via `organization_id`, mas não possuem `primary_contact_id` definido
3. O usuário espera ver pelo menos uma pessoa de contato, mesmo que não seja o "principal"

## Solução Proposta

Modificar a lógica para exibir:
1. **Primeiro**: O contato principal (`primary_contact_id`), se definido
2. **Fallback**: Caso não haja contato principal, mostrar a primeira pessoa vinculada à organização

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Organizations.tsx` | Alterar query para incluir pessoas vinculadas como fallback |

## Alterações Técnicas

### Nova Query

Modificar a query de organizações para incluir tanto o `primary_contact` quanto as pessoas vinculadas:

```typescript
const query = supabase
  .from('organizations')
  .select(`
    *,
    primary_contact:people!primary_contact_id(
      id, name, phone, email
    ),
    linked_people:people!people_organization_id_fkey(
      id, name, phone, email
    )
  `)
  .order('created_at', { ascending: false });
```

### Lógica de Fallback

Após buscar os dados, processar para usar fallback:

```typescript
const processedData = data.map(org => ({
  ...org,
  primary_contact: org.primary_contact || 
    (org.linked_people?.[0] ? {
      id: org.linked_people[0].id,
      name: org.linked_people[0].name,
      phone: org.linked_people[0].phone,
      email: org.linked_people[0].email,
    } : null),
  // Indicador visual se é fallback (não é primary)
  is_fallback_contact: !org.primary_contact && org.linked_people?.length > 0,
}));
```

### Atualização do Tipo

```typescript
type OrganizationWithContact = Organization & {
  primary_contact: {
    id?: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  linked_people?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  }[];
  is_fallback_contact?: boolean;
};
```

### Indicação Visual (Opcional)

Na tabela, quando for contato de fallback (não definido como principal), mostrar com estilo diferente:

```typescript
// Na célula de contact_name
{row.original.is_fallback_contact ? (
  <span className="text-muted-foreground italic">
    {row.original.primary_contact?.name}
    <span className="text-xs ml-1">(vinculado)</span>
  </span>
) : (
  <Link ...>{row.original.primary_contact?.name}</Link>
)}
```

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| CATEDRAL: Contato Principal = `-` | CATEDRAL: Contato Principal = `Hamilton (vinculado)` |
| PRAGON: Contato Principal = `-` | PRAGON: Contato Principal = `Fernando (vinculado)` |

Organizações com `primary_contact_id` definido continuam exibindo normalmente. Organizações sem `primary_contact_id` mas com pessoas vinculadas mostram o primeiro contato vinculado com indicação visual diferenciada.
