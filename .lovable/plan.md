
# Implementacao de Badge de Vendedor para Leads do WhatsApp

## Resumo do Problema

Atualmente, quando um contato e criado automaticamente via integracao com Timelines.ai (WhatsApp), nao ha indicacao visual de qual vendedor captou o lead. Os contatos sao criados com `owner_id = null` e `created_by = null`.

### Dados Atuais

Ao analisar o banco de dados, identifiquei que:
- Todos os contatos com `lead_source = 'WhatsApp'` possuem `owner_id = null`
- Os canais do WhatsApp (`whatsapp_channels`) ja possuem `owner_id` configurado para alguns vendedores
- O webhook atual cria pessoas sem associar o `owner_id` do canal

## Solucao Proposta

### Fase 1: Atualizar Webhook para Atribuir Owner

Modificar o webhook `timelines-webhook` para:
1. Ao criar uma nova pessoa, buscar o `owner_id` do canal WhatsApp associado
2. Atribuir esse `owner_id` como dono do contato criado
3. Registrar no historico quem captou o lead

**Arquivo**: `supabase/functions/timelines-webhook/index.ts`

```typescript
// Apos obter o channel (linha ~404)
const channelOwnerId = channel.owner_id;

// Na criacao da pessoa (linha ~453-461)
const { data: newPerson, error: personError } = await supabase
  .from('people')
  .insert({
    name: contactName,
    whatsapp: formattedPhone.slice(0, 50),
    lead_source: 'WhatsApp',
    owner_id: channelOwnerId || null,  // Atribuir owner do canal
  })
  .select()
  .single();

// No historico (linha ~471-475)
await supabase.from('people_history').insert({
  person_id: personId,
  event_type: 'created',
  description: channelOwnerId 
    ? `Contato criado automaticamente via WhatsApp (Canal: ${channelName})`
    : 'Contato criado automaticamente via WhatsApp',
  created_by: channelOwnerId || null,
});
```

### Fase 2: Adicionar Coluna "Captado por" na Tabela de Pessoas

Modificar a query e a tabela para mostrar o vendedor que captou o lead.

**Arquivo**: `src/pages/People.tsx`

Atualizar a query para incluir o profile do owner:

```typescript
const fetchPeople = async ({ from, to }: { from: number; to: number }) => {
  let query = supabase
    .from('people')
    .select(`
      *,
      organizations:organizations!people_organization_id_fkey(id, name, cnpj, address_city, address_state, automotores),
      owner:profiles!people_owner_id_fkey(id, user_id, full_name, avatar_url)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });
  // ...
};
```

**Arquivo**: `src/components/people/PeopleTable.tsx`

Adicionar nova coluna "Captado por" com badge do vendedor:

```typescript
// Adicionar no columnLabels
const columnLabels: Record<string, string> = {
  // ...existentes...
  owner: 'Captado por',
};

// Adicionar coluna owner apos a coluna de nome
{
  id: 'owner',
  accessorFn: (row) => row.owner?.full_name ?? '',
  header: ({ column }) => <SortableHeader column={column} title="Captado por" />,
  cell: ({ row }) => {
    const owner = row.original.owner;
    const leadSource = row.original.lead_source;
    
    // So mostrar badge para leads de WhatsApp
    if (leadSource !== 'WhatsApp') {
      return <span className="text-muted-foreground/50">-</span>;
    }
    
    if (!owner) {
      return (
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground text-xs">
          <MessageCircle className="h-3 w-3 mr-1" />
          Nao atribuido
        </Badge>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={owner.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(owner.full_name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{owner.full_name}</span>
      </div>
    );
  },
},
```

### Fase 3: Atualizar Tipos TypeScript

**Arquivo**: `src/components/people/PeopleTable.tsx`

```typescript
interface PersonWithOrg extends Person {
  organizations?: {
    id: string;
    name: string;
    cnpj: string | null;
    address_city: string | null;
    address_state: string | null;
    automotores: number | null;
  } | null;
  owner?: {
    id: string;
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}
```

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/timelines-webhook/index.ts` | Atribuir `owner_id` do canal ao criar pessoa |
| `src/pages/People.tsx` | Incluir join com `profiles` na query de pessoas |
| `src/components/people/PeopleTable.tsx` | Adicionar coluna "Captado por" com Avatar e nome |

## Comportamento Esperado

1. **Novos contatos via WhatsApp**: Serao criados com o `owner_id` do canal que recebeu a mensagem
2. **Tabela de Pessoas**: Exibira uma nova coluna "Captado por" mostrando:
   - Avatar + nome do vendedor para leads com owner atribuido
   - Badge "Nao atribuido" para leads de WhatsApp sem owner
   - Traco (-) para contatos de outras origens

3. **Contatos existentes**: Continuarao sem owner (sera necessario atribuir manualmente ou criar um script de migracao se desejado)

## Visualizacao Esperada

A coluna "Captado por" aparecera assim na tabela:

| Nome | Telefone | WhatsApp | Captado por |
|------|----------|----------|-------------|
| 554391480358 | - | 554391480358 | [Avatar] Adriana Jacometo |
| (44) 9759-7441 | - | +5544975974... | [Badge] Nao atribuido |
| Guilherme Favarin | - | 554899817391 | [Avatar] Leonardo Sanches |

## Secao Tecnica

### Foreign Key Existente

A tabela `people` ja possui o campo `owner_id` que faz referencia a `auth.users`. Para o join funcionar, precisamos usar a tabela `profiles` que tem `user_id` como referencia.

### Performance

O join adicional com `profiles` e leve pois:
- E um JOIN 1:1 (cada pessoa tem no maximo 1 owner)
- A tabela `profiles` e pequena (apenas usuarios do sistema)
- O campo `user_id` na tabela profiles tem indice implicito

### Consideracoes de Migracao

Os contatos criados antes desta mudanca continuarao com `owner_id = null`. Para atribuir owners retroativamente, seria necessario:

1. Identificar a conversa do WhatsApp associada ao contato
2. Buscar o canal dessa conversa
3. Atribuir o `owner_id` do canal ao contato

Isso pode ser feito posteriormente via script SQL se necessario.
