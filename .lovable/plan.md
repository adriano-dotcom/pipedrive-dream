
# Plano: Atualização em Lote via Receita Federal (RF)

## Objetivo
Criar um botão na toolbar da listagem de organizações que permite atualizar múltiplas organizações via Receita Federal de forma sequencial (uma após a outra) para evitar sobrecarga na API e erros.

---

## Entendimento do Requisito

- O usuário quer selecionar múltiplas organizações e clicar em "Atualizar via RF"
- O sistema deve processar UMA organização por vez (cadência)
- Só iniciar a próxima após concluir a atual (evita rate limiting e erros)
- Exibir progresso visual durante o processo

---

## Solução Proposta

### 1. Novo Hook: `useBulkEnrichOrganizations.ts`

Hook que gerencia a atualização em lote com processamento sequencial:

```typescript
interface BulkEnrichState {
  isRunning: boolean;
  total: number;
  current: number;
  currentOrg: string | null;  // Nome da org sendo atualizada
  successCount: number;
  errorCount: number;
  errors: Array<{ orgName: string; error: string }>;
}

export function useBulkEnrichOrganizations() {
  const [state, setState] = useState<BulkEnrichState>({...});
  
  const startBulkEnrich = async (organizations: {id, name, cnpj}[]) => {
    // Filtra apenas organizações com CNPJ
    const orgsWithCnpj = organizations.filter(o => o.cnpj);
    
    for (let i = 0; i < orgsWithCnpj.length; i++) {
      setState(s => ({ ...s, current: i + 1, currentOrg: orgsWithCnpj[i].name }));
      
      try {
        await supabase.functions.invoke('enrich-organization', {
          body: { organizationId: org.id, cnpj: org.cnpj }
        });
        setState(s => ({ ...s, successCount: s.successCount + 1 }));
      } catch (error) {
        setState(s => ({ 
          ...s, 
          errorCount: s.errorCount + 1,
          errors: [...s.errors, { orgName: org.name, error: error.message }]
        }));
      }
      
      // Pequeno delay entre requisições (opcional, 500ms)
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Invalidar queries ao final
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
  };
  
  return { ...state, startBulkEnrich, cancel };
}
```

### 2. Novo Componente: `BulkEnrichDialog.tsx`

Dialog com progresso visual:

```text
┌─────────────────────────────────────────────────────────┐
│  Atualizar via Receita Federal                      ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Processando 3 de 10 organizações...                   │
│                                                         │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░  30%                  │
│                                                         │
│  Atual: WM & S TRANSPORTES LTDA ME                     │
│                                                         │
│  ✓ 2 atualizadas com sucesso                          │
│  ✗ 0 com erro                                          │
│                                                         │
│                              [Cancelar]                 │
└─────────────────────────────────────────────────────────┘
```

**Ao concluir:**
```text
┌─────────────────────────────────────────────────────────┐
│  Atualização Concluída                              ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ████████████████████████████████  100%                │
│                                                         │
│  ✓ 8 organizações atualizadas com sucesso             │
│  ✗ 2 organizações com erro                            │
│                                                         │
│  Erros:                                                │
│  • EMPRESA X: CNPJ não encontrado na RF               │
│  • EMPRESA Y: Créditos insuficientes                  │
│                                                         │
│                                        [Fechar]        │
└─────────────────────────────────────────────────────────┘
```

### 3. Alterações na Toolbar (OrganizationsTable.tsx)

Adicionar botão na área de bulk actions (quando há seleção):

```tsx
{/* Bulk actions */}
{isAdmin && selectedIds && selectedIds.length > 0 && (
  <div className="flex items-center gap-2 pl-4 border-l">
    <span className="text-sm text-muted-foreground">
      {selectedIds.length} selecionada(s)
    </span>
    
    {/* NOVO: Botão de Atualizar via RF */}
    <Button
      variant="outline"
      size="sm"
      onClick={() => onBulkEnrich?.()}
      className="h-8"
    >
      <RefreshCw className="h-4 w-4 mr-1.5" />
      Atualizar RF
    </Button>
    
    {selectedIds.length === 2 && onMerge && (
      <Button variant="outline" size="sm" onClick={onMerge}>
        <GitMerge className="h-4 w-4 mr-1.5" />
        Mesclar
      </Button>
    )}
    <Button variant="destructive" size="sm" onClick={onBulkDelete}>
      <Trash2 className="h-4 w-4 mr-1.5" />
      Excluir
    </Button>
  </div>
)}
```

### 4. Integração na Página Organizations.tsx

```tsx
// State para dialog de bulk enrich
const [bulkEnrichOpen, setBulkEnrichOpen] = useState(false);

// Organizações selecionadas com CNPJ
const selectedOrgsWithCnpj = useMemo(() => {
  return organizations
    .filter(org => selectedIds.includes(org.id) && org.cnpj)
    .map(org => ({ id: org.id, name: org.name, cnpj: org.cnpj! }));
}, [organizations, selectedIds]);

// Callback para abrir dialog
const handleBulkEnrich = () => {
  if (selectedOrgsWithCnpj.length === 0) {
    toast.warning('Nenhuma organização selecionada possui CNPJ');
    return;
  }
  setBulkEnrichOpen(true);
};

// Passar para tabela
<OrganizationsTable
  ...
  onBulkEnrich={handleBulkEnrich}
/>

// Dialog
<BulkEnrichDialog
  open={bulkEnrichOpen}
  onOpenChange={setBulkEnrichOpen}
  organizations={selectedOrgsWithCnpj}
  onComplete={() => setSelectedIds([])}
/>
```

---

## Fluxo de Processamento

```text
Usuário seleciona 5 organizações
         │
         ▼
Clica em "Atualizar RF"
         │
         ▼
Abre dialog com progresso
         │
         ▼
┌─────────────────────────────────┐
│  Para cada organização:         │
│                                 │
│  1. Atualiza estado (current)  │
│  2. Chama edge function         │
│  3. Aguarda resposta            │
│  4. Atualiza contadores         │
│  5. Delay de 500ms              │
│  6. Próxima organização         │
└─────────────────────────────────┘
         │
         ▼
Exibe resumo final
         │
         ▼
Invalida queries
```

---

## Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useBulkEnrichOrganizations.ts` | **CRIAR** - Hook para gerenciar atualização em lote sequencial |
| `src/components/organizations/BulkEnrichDialog.tsx` | **CRIAR** - Dialog com progresso e resumo |
| `src/components/organizations/OrganizationsTable.tsx` | Adicionar botão "Atualizar RF" na toolbar de bulk actions |
| `src/pages/Organizations.tsx` | Integrar hook e dialog, passar callback para tabela |

---

## Detalhes Técnicos

### Processamento Sequencial

O core da solução é o loop `for...of` com `await`:

```typescript
for (const org of organizations) {
  await processOne(org);  // Aguarda completar
  await delay(500);       // Rate limiting
}
```

Isso garante que:
- Só processa uma organização por vez
- A API não é sobrecarregada
- Erros em uma org não afetam as outras

### Cancelamento

O hook terá um `AbortController` para permitir cancelar o processo:

```typescript
const abortRef = useRef(new AbortController());

const cancel = () => {
  abortRef.current.abort();
  setState(s => ({ ...s, isRunning: false }));
};

// No loop:
if (abortRef.current.signal.aborted) break;
```

### Validações

- Só organizações com CNPJ são processadas
- Se nenhuma selecionada tiver CNPJ, exibe warning
- Botão desabilitado se nenhuma seleção

---

## Resultado Esperado

1. Usuário seleciona 10 organizações na tabela
2. Clica em "Atualizar RF" na toolbar
3. Dialog abre mostrando progresso: "Processando 1 de 8..." (8 têm CNPJ)
4. Barra de progresso avança conforme cada org é processada
5. Ao final, exibe resumo: "8 atualizadas, 0 erros"
6. Clica em "Fechar", seleção é limpa, dados atualizados

