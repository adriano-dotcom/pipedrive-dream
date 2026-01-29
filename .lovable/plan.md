
# Relatório de Performance por Corretor

## Objetivo

Criar uma nova página de relatórios que apresenta um ranking completo dos corretores com métricas de performance, incluindo taxa de conversão, volume de vendas, atividades realizadas e valor de comissão gerada.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    RELATÓRIOS DE PERFORMANCE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Filtro de Período: Últimos 30 dias ▼]  [Exportar CSV] [Exportar XLS]│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │   TOP PERFORMER          │  │   VALOR TOTAL GANHO      │        │
│  │   🏆 João Silva          │  │   R$ 1.234.567,00        │        │
│  │   R$ 450.000 fechados    │  │   +15% vs período anterior│        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │   TOTAL DE NEGÓCIOS      │  │   TAXA MÉDIA CONVERSÃO   │        │
│  │   156 negócios           │  │   32%                    │        │
│  │   48 ganhos / 52 perdidos│  │   ▲ 5% vs anterior       │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  RANKING DE CORRETORES                                              │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ # │ Corretor      │ Deals │ Ganhos │ Perdidos│ Conv. │ Valor   ││
│  ├────────────────────────────────────────────────────────────────┤│
│  │ 🥇│ João Silva    │   45  │   22   │   18    │ 55%   │ R$ 450k ││
│  │ 🥈│ Maria Santos  │   38  │   15   │   15    │ 50%   │ R$ 320k ││
│  │ 🥉│ Pedro Costa   │   32  │   12   │   12    │ 50%   │ R$ 280k ││
│  │ 4 │ Ana Oliveira  │   28  │    8   │   10    │ 44%   │ R$ 180k ││
│  │ 5 │ Carlos Lima   │   25  │    6   │   12    │ 33%   │ R$ 120k ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │   GRÁFICO DE BARRAS      │  │   ATIVIDADES POR CORRETOR│        │
│  │   Valor por Corretor     │  │   Completadas vs Pendentes│        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar

### 1. Nova Página: `src/pages/Reports.tsx`

Página principal de relatórios com:
- Filtro de período (últimos 7/30/60/90 dias ou período personalizado)
- Cards de resumo (KPIs principais)
- Tabela de ranking com ordenação
- Gráficos de performance
- Exportação CSV/Excel

### 2. `src/components/reports/BrokerRankingTable.tsx`

Tabela interativa com:
- Ranking com medalhas (ouro, prata, bronze)
- Avatar e nome do corretor
- Métricas: Total de Deals, Ganhos, Perdidos, Taxa de Conversão, Valor Total
- Ordenação por qualquer coluna
- Barra de progresso visual para taxa de conversão

### 3. `src/components/reports/BrokerPerformanceChart.tsx`

Gráfico de barras horizontais:
- Valor total ganho por corretor
- Cores diferenciadas (gradiente)
- Tooltip com detalhes

### 4. `src/components/reports/BrokerActivityChart.tsx`

Gráfico de barras agrupadas:
- Atividades completadas vs pendentes por corretor
- Visualização de produtividade

### 5. `src/components/reports/PerformanceFilters.tsx`

Filtros de período:
- Presets: 7 dias, 30 dias, 60 dias, 90 dias, Este mês, Mês passado
- Período personalizado com date picker

### 6. `src/components/reports/PerformanceSummaryCards.tsx`

Cards de KPIs:
- Top Performer (corretor com maior valor)
- Valor Total Ganho no período
- Total de Negócios (ganhos/perdidos)
- Taxa Média de Conversão

---

## Estrutura de Dados

### Query Principal: Performance por Corretor

```typescript
interface BrokerPerformance {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  
  // Métricas de Deals
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  conversionRate: number; // (won / (won + lost)) * 100
  
  // Valores
  totalWonValue: number;
  totalLostValue: number;
  pipelineValue: number; // valor em aberto
  
  // Comissões
  totalCommissionValue: number;
  
  // Atividades
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  activityCompletionRate: number;
}
```

### Query SQL para Performance

```sql
SELECT 
  p.user_id,
  p.full_name,
  p.avatar_url,
  
  -- Deals
  COUNT(DISTINCT d.id) as total_deals,
  COUNT(DISTINCT CASE WHEN d.status = 'won' THEN d.id END) as won_deals,
  COUNT(DISTINCT CASE WHEN d.status = 'lost' THEN d.id END) as lost_deals,
  COUNT(DISTINCT CASE WHEN d.status = 'open' THEN d.id END) as open_deals,
  
  -- Valores
  COALESCE(SUM(CASE WHEN d.status = 'won' THEN d.value ELSE 0 END), 0) as total_won_value,
  COALESCE(SUM(CASE WHEN d.status = 'lost' THEN d.value ELSE 0 END), 0) as total_lost_value,
  COALESCE(SUM(CASE WHEN d.status = 'open' THEN d.value ELSE 0 END), 0) as pipeline_value,
  
  -- Comissões
  COALESCE(SUM(CASE WHEN d.status = 'won' THEN d.commission_value ELSE 0 END), 0) as total_commission
  
FROM profiles p
LEFT JOIN deals d ON d.owner_id = p.user_id
  AND d.created_at >= :start_date 
  AND d.created_at <= :end_date
GROUP BY p.user_id, p.full_name, p.avatar_url
ORDER BY total_won_value DESC
```

---

## Colunas da Tabela de Ranking

| Coluna | Descrição | Ordenável |
|--------|-----------|-----------|
| # | Posição no ranking | Sim |
| Corretor | Avatar + Nome | Sim (por nome) |
| Total | Quantidade total de deals | Sim |
| Ganhos | Deals com status 'won' | Sim |
| Perdidos | Deals com status 'lost' | Sim |
| Taxa Conv. | (ganhos / (ganhos + perdidos)) × 100 | Sim |
| Valor Ganho | Soma dos valores de deals ganhos | Sim |
| Comissão | Soma das comissões de deals ganhos | Sim |
| Pipeline | Valor em aberto | Sim |

---

## Métricas Calculadas

1. **Taxa de Conversão**
   - Fórmula: `(wonDeals / (wonDeals + lostDeals)) * 100`
   - Considera apenas deals finalizados (won + lost)
   - Se não houver deals finalizados, exibe "N/A"

2. **Ticket Médio**
   - Fórmula: `totalWonValue / wonDeals`
   - Valor médio por deal ganho

3. **Ranking**
   - Ordenado por valor total ganho (default)
   - Pode ser alterado pelo usuário

---

## Navegação

Adicionar novo item no menu lateral:

```typescript
// Em AppSidebar.tsx
const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutGrid },
  { title: 'Organizações', url: '/organizations', icon: Building },
  { title: 'Pessoas', url: '/people', icon: UsersRound },
  { title: 'Negócios', url: '/deals', icon: Handshake },
  { title: 'Atividades', url: '/activities', icon: ListTodo },
  { title: 'Relatórios', url: '/reports', icon: BarChart3 }, // NOVO
];
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/Reports.tsx` | Página principal de relatórios |
| `src/components/reports/BrokerRankingTable.tsx` | Tabela de ranking |
| `src/components/reports/BrokerPerformanceChart.tsx` | Gráfico de valores |
| `src/components/reports/BrokerActivityChart.tsx` | Gráfico de atividades |
| `src/components/reports/PerformanceFilters.tsx` | Filtros de período |
| `src/components/reports/PerformanceSummaryCards.tsx` | Cards de KPIs |
| `src/hooks/useBrokerPerformance.ts` | Hook para buscar dados |

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/App.tsx` | Adicionar rota /reports |
| `src/components/layout/AppSidebar.tsx` | Adicionar item de menu "Relatórios" |
| `.lovable/plan.md` | Documentar Sprint 6 |

---

## Funcionalidade de Exportação

Reutilizar o sistema de exportação já existente (`src/lib/export.ts`):

```typescript
const exportColumns: ExportColumn[] = [
  { id: 'position', label: 'Posição', accessor: (_, i) => i + 1 },
  { id: 'fullName', label: 'Corretor', accessor: r => r.fullName },
  { id: 'totalDeals', label: 'Total Deals', accessor: r => r.totalDeals },
  { id: 'wonDeals', label: 'Ganhos', accessor: r => r.wonDeals },
  { id: 'lostDeals', label: 'Perdidos', accessor: r => r.lostDeals },
  { id: 'conversionRate', label: 'Taxa Conversão (%)', accessor: r => r.conversionRate.toFixed(1) },
  { id: 'totalWonValue', label: 'Valor Ganho (R$)', accessor: r => r.totalWonValue },
  { id: 'totalCommission', label: 'Comissão (R$)', accessor: r => r.totalCommissionValue },
  { id: 'pipelineValue', label: 'Pipeline (R$)', accessor: r => r.pipelineValue },
];
```

---

## Visualização Mobile

```text
┌────────────────────────────────────┐
│ Relatórios de Performance          │
│ [Período: 30 dias ▼]               │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🏆 Top Performer             │  │
│  │ João Silva - R$ 450.000      │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Valor Total: R$ 1.234.567    │  │
│  └──────────────────────────────┘  │
│                                    │
│  RANKING                           │
│  ──────────────────────────────    │
│  🥇 João Silva                     │
│     45 deals • 55% conv. • R$ 450k│
│  ──────────────────────────────    │
│  🥈 Maria Santos                   │
│     38 deals • 50% conv. • R$ 320k│
│  ──────────────────────────────    │
│  🥉 Pedro Costa                    │
│     32 deals • 50% conv. • R$ 280k│
│                                    │
└────────────────────────────────────┘
```

---

## Acesso por Permissão

- **Administradores**: Veem todos os corretores e podem exportar
- **Corretores**: Veem apenas sua própria performance e posição no ranking (dados dos outros são visíveis para comparação, mas sem detalhes sensíveis como comissão)

---

## Tecnologias Utilizadas

- **Recharts**: Gráficos de barras (já instalado)
- **@tanstack/react-table**: Tabela ordenável (já instalado)
- **date-fns**: Cálculos de período (já instalado)
- **ExportButtons**: Componente existente para exportação

---

## Estimativa de Tempo

| Tarefa | Tempo |
|--------|-------|
| Página Reports.tsx | 2-3h |
| useBrokerPerformance hook | 1-2h |
| BrokerRankingTable | 2-3h |
| PerformanceSummaryCards | 1h |
| BrokerPerformanceChart | 1-2h |
| BrokerActivityChart | 1h |
| PerformanceFilters | 1h |
| Integração e navegação | 1h |
| Responsividade mobile | 1-2h |
| **Total** | **11-16h** |

---

## Atualização do plan.md

```markdown
### SPRINT 6: Relatórios de Performance ✅ CONCLUÍDO

#### 6.1 Ranking de Corretores ✅
- Tabela de ranking com métricas completas
- Ordenação por qualquer coluna
- Medalhas para top 3 performers
- Filtro por período

#### 6.2 Métricas de Conversão ✅
- Taxa de conversão por corretor
- Valor total ganho
- Comissões acumuladas
- Pipeline em aberto

#### 6.3 Gráficos de Performance ✅
- Gráfico de barras por valor
- Gráfico de atividades por corretor
- Cards de KPIs principais

#### 6.4 Exportação ✅
- Exportar relatório em CSV
- Exportar relatório em Excel

**Arquivos criados:**
- `src/pages/Reports.tsx`
- `src/components/reports/BrokerRankingTable.tsx`
- `src/components/reports/BrokerPerformanceChart.tsx`
- `src/components/reports/BrokerActivityChart.tsx`
- `src/components/reports/PerformanceFilters.tsx`
- `src/components/reports/PerformanceSummaryCards.tsx`
- `src/hooks/useBrokerPerformance.ts`

**Arquivos modificados:**
- `src/App.tsx`
- `src/components/layout/AppSidebar.tsx`
```
