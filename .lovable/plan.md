
# Plano: Excluir Organizações Já Atualizadas do Enriquecimento em Lote

## Objetivo
Evitar que organizações que já foram atualizadas via Receita Federal sejam processadas novamente no enriquecimento em lote. O sistema já possui o campo `last_enriched_at` na tabela `organizations` que é preenchido quando uma organização é atualizada via RF.

---

## Situação Atual

Ao selecionar organizações e clicar em "Atualizar RF":
1. O sistema filtra apenas organizações com CNPJ
2. Envia para atualização mesmo se já foram atualizadas anteriormente (gasto desnecessário de créditos na API)

---

## Solução Proposta

Adicionar um filtro adicional para excluir organizações que já possuem `last_enriched_at` preenchido.

---

## Alterações Necessárias

### 1. Arquivo: `src/pages/Organizations.tsx`

Modificar o `useMemo` que calcula `selectedOrgsWithCnpj` para também filtrar organizações que **não possuem** `last_enriched_at`:

**Código atual (linha ~395-399):**
```typescript
const selectedOrgsWithCnpj = useMemo(() => {
  return organizations
    .filter(org => selectedIds.includes(org.id) && org.cnpj)
    .map(org => ({ id: org.id, name: org.name, cnpj: org.cnpj! }));
}, [organizations, selectedIds]);
```

**Novo código:**
```typescript
const selectedOrgsForEnrich = useMemo(() => {
  return organizations
    .filter(org => 
      selectedIds.includes(org.id) && 
      org.cnpj && 
      !org.last_enriched_at  // Excluir já atualizadas
    )
    .map(org => ({ id: org.id, name: org.name, cnpj: org.cnpj! }));
}, [organizations, selectedIds]);
```

### 2. Melhorar Feedback ao Usuário

Atualizar a mensagem de warning quando não há organizações elegíveis:

```typescript
const handleBulkEnrich = () => {
  // Contar quantas já foram atualizadas
  const alreadyEnrichedCount = organizations.filter(
    org => selectedIds.includes(org.id) && org.cnpj && org.last_enriched_at
  ).length;
  
  if (selectedOrgsForEnrich.length === 0) {
    if (alreadyEnrichedCount > 0) {
      toast.warning(
        `Todas as ${alreadyEnrichedCount} organização(ões) selecionada(s) já foram atualizadas via RF`
      );
    } else {
      toast.warning('Nenhuma organização selecionada possui CNPJ');
    }
    return;
  }
  
  // Se algumas foram puladas, informar
  if (alreadyEnrichedCount > 0) {
    toast.info(
      `${alreadyEnrichedCount} organização(ões) pulada(s) (já atualizadas)`
    );
  }
  
  setBulkEnrichOpen(true);
};
```

---

## Fluxo Esperado

```text
Usuário seleciona 10 organizações
         │
         ▼
Clica em "Atualizar RF"
         │
         ▼
Sistema verifica:
  - 8 têm CNPJ
  - 3 já foram atualizadas (last_enriched_at preenchido)
  - 5 são elegíveis
         │
         ▼
Exibe toast: "3 organização(ões) pulada(s) (já atualizadas)"
         │
         ▼
Abre dialog processando apenas 5 organizações
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Organizations.tsx` | Filtrar organizações sem `last_enriched_at` e melhorar mensagens de feedback |

---

## Detalhes Técnicos

O campo `last_enriched_at` (tipo `timestamp with time zone`) já existe na tabela `organizations` e é automaticamente preenchido pela edge function `enrich-organization` quando a atualização é bem-sucedida:

```typescript
// Na edge function (já implementado)
const updateData = {
  // ...outros campos...
  last_enriched_at: new Date().toISOString(),
  // ...
};
```

Portanto, basta verificar se esse campo é `null` ou não para saber se a organização já foi atualizada.
