
# Ajustar Tabs da Pagina DealDetails

## Objetivo

Reorganizar as tabs da pagina de detalhes do negocio para seguir a ordem correta e adicionar a aba "Resumo" como padrao.

---

## Comparativo Atual vs Esperado

| Ordem | Atual | Esperado |
|-------|-------|----------|
| 1 | Notas (padrao) | **Resumo** (padrao) |
| 2 | Arquivos | Atividades |
| 3 | Atividades | Historico |
| 4 | E-mails | Anexos |
| 5 | Historico | Notas |
| 6 | - | E-mails (manter) |

---

## Modificacoes Necessarias

### 1. Adicionar Tab "Resumo"

A aba Resumo deve conter um resumo consolidado do negocio, incluindo:

- Informacoes principais do negocio
- Proxima atividade agendada
- Ultima nota adicionada
- Ultimos arquivos
- Status geral

### 2. Reordenar as Tabs

Nova ordem:
1. Resumo (defaultValue)
2. Atividades (X)
3. Historico (X)
4. Anexos (X)
5. Notas (X)
6. E-mails (X)

### 3. Alterar defaultValue

```typescript
// De:
<Tabs defaultValue="notes" ...>

// Para:
<Tabs defaultValue="summary" ...>
```

---

## Componente DealSummary (Novo)

Criar novo componente para a aba Resumo com as seguintes secoes:

```text
┌─────────────────────────────────────────────────────────┐
│ RESUMO DO NEGOCIO                                       │
├─────────────────────────────────────────────────────────┤
│ [📅] Proxima Atividade                                  │
│     Reuniao com cliente - 15/02/2025 14:00             │
│     [Ver todas atividades]                              │
├─────────────────────────────────────────────────────────┤
│ [📝] Ultima Nota                                        │
│     "Cliente demonstrou interesse na proposta..."       │
│     por Joao - ha 2 dias                               │
│     [Ver todas notas]                                   │
├─────────────────────────────────────────────────────────┤
│ [📎] Arquivos Recentes (3)                             │
│     proposta.pdf | contrato.docx | anexo.jpg           │
│     [Ver todos arquivos]                               │
├─────────────────────────────────────────────────────────┤
│ [📊] Timeline Resumida                                  │
│     Ultimos 3 eventos do historico                     │
└─────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar/Criar

| Arquivo | Acao |
|---------|------|
| `src/components/deals/detail/DealSummary.tsx` | **CRIAR** - Componente da aba Resumo |
| `src/pages/DealDetails.tsx` | Reordenar tabs, adicionar Resumo, mudar defaultValue |

---

## Implementacao DealSummary.tsx

```typescript
interface DealSummaryProps {
  deal: Deal;
  activities: Activity[];
  notes: Note[];
  files: File[];
  history: History[];
  onTabChange: (tab: string) => void;
}

export function DealSummary({ 
  deal, 
  activities, 
  notes, 
  files, 
  history,
  onTabChange 
}: DealSummaryProps) {
  const nextActivity = activities
    .filter(a => !a.completed_at && a.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0];

  const latestNote = notes[0];
  const recentFiles = files.slice(0, 3);
  const recentHistory = history.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Proxima Atividade */}
      <Card>...</Card>
      
      {/* Ultima Nota */}
      <Card>...</Card>
      
      {/* Arquivos Recentes */}
      <Card>...</Card>
      
      {/* Timeline Resumida */}
      <Card>...</Card>
    </div>
  );
}
```

---

## Modificacoes em DealDetails.tsx

### Alterar ordem das TabsTrigger

```typescript
<Tabs defaultValue="summary" className="w-full" onValueChange={setActiveTab}>
  <TabsList className="w-full justify-start bg-muted/50 p-1">
    <TabsTrigger value="summary" className="flex-1 sm:flex-none">
      Resumo
    </TabsTrigger>
    <TabsTrigger value="activities" className="flex-1 sm:flex-none">
      Atividades ({activities.length})
    </TabsTrigger>
    <TabsTrigger value="history" className="flex-1 sm:flex-none">
      Historico ({history.length})
    </TabsTrigger>
    <TabsTrigger value="files" className="flex-1 sm:flex-none">
      Anexos ({files.length})
    </TabsTrigger>
    <TabsTrigger value="notes" className="flex-1 sm:flex-none">
      Notas ({notes.length})
    </TabsTrigger>
    <TabsTrigger value="emails" className="flex-1 sm:flex-none">
      E-mails ({emails.length})
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="summary" className="mt-4">
    <DealSummary 
      deal={deal}
      activities={activities}
      notes={notes}
      files={files}
      history={history}
      onTabChange={(tab) => /* mudar tab */}
    />
  </TabsContent>
  
  {/* ... demais TabsContent na nova ordem ... */}
</Tabs>
```

---

## Observacoes

1. **Contador na aba Resumo**: A aba Resumo nao tera contador pois e apenas uma visao consolidada
2. **Renomear "Arquivos" para "Anexos"**: Conforme solicitado
3. **E-mails mantido**: Funcionalidade existente sera preservada como ultima aba
4. **Controle de tab ativo**: Adicionar estado para permitir navegacao programatica do Resumo para outras abas

---

## Estimativa

| Tarefa | Tempo |
|--------|-------|
| Criar DealSummary.tsx | 45min |
| Reordenar tabs em DealDetails.tsx | 15min |
| Renomear Arquivos para Anexos | 5min |
| Implementar navegacao entre abas | 15min |
| Testes e ajustes | 20min |
| **Total** | **~1h40** |
