
# Sprint 4: Gráficos de Pipeline e Forecast no Dashboard

## Objetivo
Adicionar visualizações de dados ao Dashboard usando Recharts para fornecer insights visuais sobre o funil de vendas, performance de vendas e previsão de receita.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Stats Cards - Já existentes]                                      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │   FUNIL DE VENDAS        │  │   VALOR POR ETAPA        │        │
│  │   (Gráfico de Funil)     │  │   (Gráfico de Barras)    │        │
│  │                          │  │                          │        │
│  │   ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼       │  │   ████████  R$ 212k      │        │
│  │    ▼▼▼▼▼▼▼▼▼▼▼          │  │   ██████    R$ 122k      │        │
│  │     ▼▼▼▼▼▼▼▼            │  │   ████      R$ 0         │        │
│  │      ▼▼▼▼▼▼             │  │   ██        R$ 0         │        │
│  │       ▼▼▼▼              │  │                          │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │   FORECAST (PREVISÃO)    │  │   STATUS DOS NEGÓCIOS    │        │
│  │   (Área Chart)           │  │   (Gráfico de Pizza)     │        │
│  │                          │  │                          │        │
│  │        ╱──────           │  │      ████                │        │
│  │     ╱──                  │  │   ████████████           │        │
│  │   ──                     │  │      ████                │        │
│  │   Jan  Fev  Mar  Abr     │  │                          │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Próximas Atividades - Já existente]                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar

### 1. `src/components/dashboard/PipelineFunnelChart.tsx`

Gráfico de funil mostrando a quantidade de negócios em cada etapa do pipeline selecionado:

- **Tipo**: Bar Chart horizontal (simula funil)
- **Dados**: Quantidade de deals por stage
- **Cores**: Cores das etapas do pipeline (stage.color)
- **Interação**: Tooltip mostrando detalhes ao hover

### 2. `src/components/dashboard/StageValueChart.tsx`

Gráfico de barras horizontais mostrando o valor total por etapa:

- **Tipo**: Bar Chart horizontal
- **Dados**: Valor total (SUM) por stage
- **Formatação**: Valores em R$ formatados
- **Cores**: Cores das etapas do pipeline

### 3. `src/components/dashboard/ForecastChart.tsx`

Gráfico de área mostrando previsão de receita ponderada:

- **Tipo**: Area Chart
- **Dados**: Valor esperado = (valor do deal * probabilidade do stage)
- **Meses**: Agrupa por expected_close_date ou created_at
- **Linhas**: Valor total vs Valor ponderado (forecast)

### 4. `src/components/dashboard/DealsStatusChart.tsx`

Gráfico de pizza mostrando distribuição de status:

- **Tipo**: Pie Chart
- **Dados**: Contagem de deals por status (open, won, lost)
- **Cores**: Verde (ganhos), Vermelho (perdidos), Azul (abertos)

---

## Modificações no Dashboard

### `src/pages/Dashboard.tsx`

Adicionar nova seção de gráficos entre os Stats Cards e Próximas Atividades:

- Import dos novos componentes de chart
- Nova query para buscar dados de pipeline/deals para charts
- Layout responsivo: 2 colunas em desktop, 1 coluna em mobile
- Seletor de pipeline para filtrar os gráficos

---

## Queries de Dados

### Query 1: Dados do Funil e Valor por Etapa

```typescript
// Busca stages com contagem e valor de deals
const { data: pipelineData } = useQuery({
  queryKey: ['dashboard-pipeline', selectedPipelineId],
  queryFn: async () => {
    const { data: stages } = await supabase
      .from('stages')
      .select(`
        id, name, color, position, probability,
        deals!inner(id, value, status)
      `)
      .eq('pipeline_id', selectedPipelineId)
      .order('position');
    
    return stages?.map(stage => ({
      name: stage.name,
      color: stage.color,
      count: stage.deals?.filter(d => d.status === 'open').length || 0,
      value: stage.deals?.filter(d => d.status === 'open')
        .reduce((sum, d) => sum + Number(d.value || 0), 0) || 0,
      weightedValue: stage.deals?.filter(d => d.status === 'open')
        .reduce((sum, d) => sum + (Number(d.value || 0) * stage.probability / 100), 0) || 0
    }));
  }
});
```

### Query 2: Dados de Status

```typescript
// Busca contagem por status
const { data: statusData } = useQuery({
  queryKey: ['dashboard-status'],
  queryFn: async () => {
    const { data } = await supabase
      .from('deals')
      .select('status');
    
    return {
      open: data?.filter(d => d.status === 'open').length || 0,
      won: data?.filter(d => d.status === 'won').length || 0,
      lost: data?.filter(d => d.status === 'lost').length || 0
    };
  }
});
```

### Query 3: Dados de Forecast por Mês

```typescript
// Agrupa deals por mês de fechamento esperado
const { data: forecastData } = useQuery({
  queryKey: ['dashboard-forecast'],
  queryFn: async () => {
    const { data } = await supabase
      .from('deals')
      .select(`
        id, value, expected_close_date, created_at,
        stages(probability)
      `)
      .eq('status', 'open');
    
    // Agrupa por mês e calcula valor ponderado
    return groupByMonth(data);
  }
});
```

---

## Tecnologias Utilizadas

- **Recharts**: Já instalado (`recharts: ^2.15.4`)
- **Chart Components**: Usar `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` de `@/components/ui/chart`
- **Cores**: Utilizar cores dos stages (stage.color) e variáveis CSS existentes

---

## Design Visual

### Estilo dos Cards de Gráfico

```tsx
<Card className="overflow-hidden">
  <CardHeader className="border-b border-border/50 bg-muted/20">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <BarChart3 className="h-5 w-5 text-primary" />
      </div>
      <div>
        <CardTitle className="text-lg">Funil de Vendas</CardTitle>
        <CardDescription>Negócios por etapa</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent className="pt-6">
    <ChartContainer config={chartConfig}>
      {/* Chart content */}
    </ChartContainer>
  </CardContent>
</Card>
```

### Cores Sugeridas

| Status | Cor | HSL |
|--------|-----|-----|
| Abertos | Azul | hsl(217, 91%, 60%) |
| Ganhos | Verde | hsl(142, 71%, 45%) |
| Perdidos | Vermelho | hsl(0, 84%, 60%) |

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/dashboard/PipelineFunnelChart.tsx` | Gráfico de funil horizontal |
| `src/components/dashboard/StageValueChart.tsx` | Barras de valor por etapa |
| `src/components/dashboard/ForecastChart.tsx` | Gráfico de área com forecast |
| `src/components/dashboard/DealsStatusChart.tsx` | Pizza de status |
| `src/components/dashboard/DashboardCharts.tsx` | Container dos gráficos |

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Dashboard.tsx` | Adicionar seção de gráficos |
| `.lovable/plan.md` | Marcar Sprint 4 como concluído |

---

## Layout Responsivo

```text
Desktop (lg+):
┌────────────────┬────────────────┐
│  Funil         │  Valor/Etapa   │
└────────────────┴────────────────┘
┌────────────────┬────────────────┐
│  Forecast      │  Status        │
└────────────────┴────────────────┘

Mobile (< lg):
┌────────────────────────────────┐
│  Funil                         │
└────────────────────────────────┘
┌────────────────────────────────┐
│  Valor/Etapa                   │
└────────────────────────────────┘
┌────────────────────────────────┐
│  Forecast                      │
└────────────────────────────────┘
┌────────────────────────────────┐
│  Status                        │
└────────────────────────────────┘
```

---

## Estimativa de Tempo

| Tarefa | Tempo |
|--------|-------|
| PipelineFunnelChart | 1-2h |
| StageValueChart | 1h |
| ForecastChart | 1-2h |
| DealsStatusChart | 1h |
| DashboardCharts container | 1h |
| Integração no Dashboard | 1-2h |
| Responsividade e polish | 1h |
| **Total** | **7-10h** |

---

## Atualização do plan.md

```markdown
### SPRINT 4: Dashboard e Relatórios ✅ CONCLUÍDO

#### 4.1 Gráficos de Pipeline ✅
- Funil de vendas (negócios por etapa)
- Valor por etapa (barras horizontais)
- Cores sincronizadas com etapas do pipeline

#### 4.2 Gráficos de Forecast ✅
- Previsão de receita ponderada por probabilidade
- Distribuição de status (pizza: abertos/ganhos/perdidos)
- Seletor de pipeline para filtrar dados

**Arquivos criados:**
- `src/components/dashboard/PipelineFunnelChart.tsx`
- `src/components/dashboard/StageValueChart.tsx`
- `src/components/dashboard/ForecastChart.tsx`
- `src/components/dashboard/DealsStatusChart.tsx`
- `src/components/dashboard/DashboardCharts.tsx`

**Arquivos modificados:**
- `src/pages/Dashboard.tsx`
```
