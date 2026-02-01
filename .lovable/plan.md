
# Plano: Botão "Atualizar via RF" na Listagem de Organizações

## Objetivo
Adicionar o botão de enriquecimento de dados via Casa dos Dados diretamente na tabela/lista de organizações (`/organizations`), permitindo atualizar os dados de uma empresa sem precisar entrar na página de detalhes.

---

## Alterações Necessárias

### 1. OrganizationsTable.tsx (Desktop)

**Modificações na coluna "Ações":**

- Adicionar botão "Atualizar via RF" com ícone `RefreshCw` ao lado dos botões de editar/excluir
- O botão só aparece se a organização tiver CNPJ cadastrado
- Exibir tooltip informativo ao passar o mouse
- Estado de loading (spinner) enquanto a chamada está em andamento
- Desabilitar o botão durante o enriquecimento

**Implementação:**

```typescript
// Adicionar import
import { RefreshCw } from 'lucide-react';

// Na coluna actions, adicionar:
{row.original.cnpj && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleEnrich(row.original.id, row.original.cnpj)}
          disabled={enrichingId === row.original.id}
        >
          {enrichingId === row.original.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 text-primary" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Atualizar via Receita Federal</TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

**Estado necessário:**
- Novo state `enrichingId` para rastrear qual organização está sendo atualizada
- Função `handleEnrich` que chama a Edge Function e gerencia o estado

---

### 2. OrganizationsMobileList.tsx (Mobile)

**Modificações no card de organização:**

- Adicionar botão "Atualizar RF" na seção de ações (ao lado de Editar/Excluir)
- Mesma lógica: só aparece se tem CNPJ, exibe loading durante chamada

---

### 3. Gerenciamento de Estado

**Desafio:** O hook `useEnrichOrganization` atual recebe `organizationId` como parâmetro fixo. Para a listagem, precisamos de uma versão que aceite o ID dinamicamente.

**Solução:** Criar uma versão do mutation que recebe `organizationId` no momento da chamada:

```typescript
// Novo hook ou adaptar o existente
const enrichMutation = useMutation({
  mutationFn: async ({ organizationId, cnpj }) => {
    const { data, error } = await supabase.functions.invoke('enrich-organization', {
      body: { organizationId, cnpj },
    });
    // ... tratamento
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
    toast.success('Dados atualizados!');
  },
});
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/organizations/OrganizationsTable.tsx` | Adicionar botão RF na coluna de ações com loading state |
| `src/components/organizations/OrganizationsMobileList.tsx` | Adicionar botão RF nos cards com loading state |

---

## UX/Feedback Visual

1. **Sem CNPJ:** Botão não aparece (evita confusão)
2. **Durante chamada:** Spinner no botão específico daquela linha
3. **Sucesso:** Toast com resumo (campos atualizados, sócios sincronizados)
4. **Erro:** Toast de erro com mensagem específica (CNPJ inválido, API indisponível, etc.)

---

## Checklist de Teste

1. Clicar no botão RF de uma organização com CNPJ válido
2. Verificar que o spinner aparece apenas naquela linha
3. Confirmar toast de sucesso após atualização
4. Testar em organização sem CNPJ (botão não deve aparecer)
5. Testar versão mobile com o mesmo fluxo
6. Verificar que os dados são atualizados na listagem após refresh
