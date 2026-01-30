

# Corrigir Tela Branca nas Páginas de Detalhes (Deals e Organizations)

## Diagnóstico do Problema

As paginas `/deals/[id]` e `/organizations/[id]` estao exibindo tela branca sem qualquer feedback visual (sem skeleton, erro ou timeout). Apos analise detalhada:

1. **Os dados existem no banco** - Verificado via query SQL
2. **Nao ha erros no console** - Erro silencioso/nao capturado
3. **As queries Supabase estao corretas** - Estrutura e relacoes validadas
4. **O problema e de renderizacao** - Erro ocorre durante o render, nao na busca de dados

### Causa Raiz Identificada

Erros assincronos nao tratados estao causando crash silencioso da aplicacao React. Error boundaries nao capturam erros assincronos, resultando em tela branca sem feedback.

---

## Solucao Proposta

### 1. Adicionar Handler Global de Erros (App.tsx)

Implementar um listener para `unhandledrejection` que captura Promise rejections nao tratadas:

```typescript
// Em App.tsx
useEffect(() => {
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error("Unhandled rejection:", event.reason);
    toast.error("Ocorreu um erro. Por favor, tente novamente.");
    event.preventDefault();
  };

  window.addEventListener("unhandledrejection", handleRejection);
  return () => window.removeEventListener("unhandledrejection", handleRejection);
}, []);
```

### 2. Melhorar Tratamento de Erros nos Hooks

Adicionar tratamento explícito de erro nos hooks `useDealDetails` e `useOrganizationDetails`:

- Adicionar `onError` callback nas queries
- Retornar estado de erro para a UI
- Garantir que erros sejam logados

### 3. Adicionar Error Boundary nas Páginas de Detalhes

Criar um componente ErrorBoundary e envolver as páginas de detalhes:

```typescript
// Novo arquivo: src/components/shared/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

### 4. Adicionar Estados de Erro nas Páginas

Modificar `DealDetails.tsx` e `OrganizationDetails.tsx` para:

- Extrair estado de erro dos hooks
- Exibir mensagem de erro apropriada
- Permitir retry/recarregar

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/App.tsx` | Adicionar handler global de unhandled rejections |
| `src/hooks/useDealDetails.ts` | Adicionar tratamento de erro e retornar estado isError |
| `src/hooks/useOrganizationDetails.ts` | Adicionar tratamento de erro e retornar estado isError |
| `src/pages/DealDetails.tsx` | Adicionar tratamento de erro na UI |
| `src/pages/OrganizationDetails.tsx` | Adicionar tratamento de erro na UI |

## Arquivo a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/shared/ErrorBoundary.tsx` | Componente para capturar erros de renderizacao |

---

## Detalhes Tecnicos

### Modificacoes no useDealDetails.ts

```typescript
// Adicionar estado de erro
const { data: deal, isLoading: isLoadingDeal, isError: isDealError, error: dealError } = useQuery({
  queryKey: ['deal', dealId],
  queryFn: async () => {
    // ... query existente
  },
  enabled: !!dealId,
});

// No retorno, adicionar:
return {
  // ... outros valores
  isError: isDealError || isHistoryError || isNotesError || isActivitiesError,
  error: dealError || historyError || notesError || activitiesError,
};
```

### Modificacoes no DealDetails.tsx

```typescript
const {
  deal,
  stages,
  history,
  notes,
  activities,
  isLoading,
  isError,  // NOVO
  // ... outros
} = useDealDetails(id || '');

// Adicionar apos verificacao de loading
if (isError) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Erro ao carregar dados</h2>
      <p className="text-muted-foreground mb-4">
        Ocorreu um erro ao buscar os dados do negocio. Tente novamente.
      </p>
      <Button onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Recarregar
      </Button>
    </div>
  );
}
```

### Handler Global em App.tsx

```typescript
const App = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("Ocorreu um erro inesperado");
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    // ... resto do componente
  );
};
```

---

## Beneficios da Solucao

1. **Visibilidade de Erros** - Usuarios verao mensagem de erro ao inves de tela branca
2. **Debugging Facilitado** - Erros serao logados no console
3. **Recuperacao** - Botao de retry permite recarregar sem refresh manual
4. **Prevencao** - Handler global captura erros que possam escapar

---

## Estimativa de Tempo

| Tarefa | Tempo |
|--------|-------|
| Handler global em App.tsx | 15min |
| ErrorBoundary component | 30min |
| Modificar useDealDetails | 20min |
| Modificar useOrganizationDetails | 20min |
| Atualizar DealDetails.tsx | 15min |
| Atualizar OrganizationDetails.tsx | 15min |
| Testes | 30min |
| **Total** | **~2h** |

