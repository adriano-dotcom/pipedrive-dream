
# Correcao de Erros de Performance e Renderizacao - CRM Jacometo

## Problemas Identificados

Com base na analise dos console logs, session replay e codigo-fonte, identifiquei **3 problemas criticos** que estao causando os erros reportados:

---

## PROBLEMA 1: Warnings de Ref em Componentes de Graficos

### Sintoma
```
Warning: Function components cannot be given refs. Attempts to access this ref will fail.
Check the render method of `ForecastChart` at CartesianGrid
Check the render method of `StatCard` at Tooltip
```

### Causa Raiz
O Recharts v2.15.4 tem um problema conhecido onde alguns componentes internos (como `CartesianGrid`) tentam passar refs para function components. Isso acontece quando se usa a prop `className` diretamente no `CartesianGrid`:

```tsx
// ForecastChart.tsx - Linha 111
<CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
```

O `className` no CartesianGrid faz o Recharts tentar usar um ref que nao e suportado em function components.

### Solucao
Remover a prop `className` do CartesianGrid e usar apenas props nativas do Recharts. O estilo ja e aplicado globalmente pelo `ChartContainer` atraves de seletores CSS.

---

## PROBLEMA 2: NotFoundError - removeChild on Node

### Sintoma
```
NotFoundError: Failed to execute 'removeChild' on 'Node': 
The node to be removed is not a child of this node.
```

### Causa Raiz
Este erro ocorre quando:
1. O React tenta remover um node do DOM que ja foi removido ou movido
2. Conflitos entre re-renders do React e manipulacoes internas do Recharts
3. Mudancas de estado durante animacoes de graficos

O erro aparece especialmente na navegacao entre paginas ou quando os dados dos graficos mudam rapidamente.

### Solucao
1. Desabilitar animacoes nos graficos para evitar conflitos de estado
2. Adicionar keys estaveis aos componentes de graficos
3. Garantir que os dados passados aos graficos sejam estaveis (memoizados)

---

## PROBLEMA 3: Re-renders Excessivos no Dashboard

### Sintoma
Paginas em branco e falhas ao navegar para secoes de relatorios

### Causa Raiz
O componente `DashboardCharts` dispara multiplas queries em paralelo e usa `useEffect` para definir o pipeline padrao, causando cascatas de re-renders.

### Solucao
1. Usar `useMemo` para estabilizar os dados passados aos graficos
2. Evitar atualizacoes de estado desnecessarias

---

## Plano de Implementacao

### Fase 1: Corrigir ForecastChart

Remover a prop `className` do CartesianGrid e adicionar `isAnimationActive={false}` para prevenir conflitos:

```tsx
// src/components/dashboard/ForecastChart.tsx

// ANTES (linha 111):
<CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />

// DEPOIS:
<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />

// Adicionar isAnimationActive={false} nas Areas (linhas 139-156):
<Area
  type="monotone"
  dataKey="totalValue"
  stroke="hsl(217, 91%, 60%)"
  strokeWidth={2}
  fillOpacity={1}
  fill="url(#colorTotal)"
  name="Valor Total"
  isAnimationActive={false}
/>
<Area
  type="monotone"
  dataKey="weightedValue"
  stroke="hsl(142, 71%, 45%)"
  strokeWidth={2}
  fillOpacity={1}
  fill="url(#colorWeighted)"
  name="Valor Ponderado"
  isAnimationActive={false}
/>
```

### Fase 2: Corrigir PipelineFunnelChart e StageValueChart

Adicionar `isAnimationActive={false}` nos componentes Bar:

```tsx
// src/components/dashboard/PipelineFunnelChart.tsx
<Bar 
  dataKey="count" 
  radius={[0, 4, 4, 0]}
  maxBarSize={40}
  isAnimationActive={false}
>

// src/components/dashboard/StageValueChart.tsx
<Bar 
  dataKey="value" 
  radius={[0, 4, 4, 0]}
  maxBarSize={40}
  isAnimationActive={false}
  label={...}
>
```

### Fase 3: Corrigir DealsStatusChart

```tsx
// src/components/dashboard/DealsStatusChart.tsx
<Pie
  data={pieData}
  cx="50%"
  cy="50%"
  innerRadius={50}
  outerRadius={80}
  paddingAngle={2}
  dataKey="value"
  nameKey="label"
  isAnimationActive={false}
>
```

### Fase 4: Corrigir Graficos de Reports

```tsx
// src/components/reports/BrokerPerformanceChart.tsx
<Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>

// src/components/reports/BrokerActivityChart.tsx
<Bar
  dataKey="completadas"
  name="Completadas"
  fill="hsl(142, 71%, 45%)"
  radius={[4, 4, 0, 0]}
  isAnimationActive={false}
/>
<Bar
  dataKey="pendentes"
  name="Pendentes"
  fill="hsl(45, 93%, 47%)"
  radius={[4, 4, 0, 0]}
  isAnimationActive={false}
/>
```

### Fase 5: Estabilizar Dados com useMemo (DashboardCharts)

```tsx
// src/components/dashboard/DashboardCharts.tsx

// Memoizar os dados passados aos graficos para evitar re-renders
const stablePipelineData = useMemo(() => pipelineData || [], [pipelineData]);
const stableForecastData = useMemo(() => forecastData || [], [forecastData]);
const stableStatusData = useMemo(() => statusData || null, [statusData]);

// Usar dados memoizados nos componentes:
<PipelineFunnelChart data={stablePipelineData} loading={pipelineLoading} />
<StageValueChart data={stablePipelineData} loading={pipelineLoading} />
<ForecastChart data={stableForecastData} loading={forecastLoading} />
<DealsStatusChart data={stableStatusData} loading={statusLoading} />
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/dashboard/ForecastChart.tsx` | Remover className do CartesianGrid, adicionar isAnimationActive={false} |
| `src/components/dashboard/PipelineFunnelChart.tsx` | Adicionar isAnimationActive={false} |
| `src/components/dashboard/StageValueChart.tsx` | Adicionar isAnimationActive={false} |
| `src/components/dashboard/DealsStatusChart.tsx` | Adicionar isAnimationActive={false} |
| `src/components/dashboard/DashboardCharts.tsx` | Adicionar useMemo para estabilizar dados |
| `src/components/reports/BrokerPerformanceChart.tsx` | Adicionar isAnimationActive={false} |
| `src/components/reports/BrokerActivityChart.tsx` | Adicionar isAnimationActive={false} |

---

## Secao Tecnica

### Por que desabilitar animacoes resolve o problema?

O Recharts usa animacoes CSS/JS que manipulam o DOM diretamente. Quando o React tenta fazer um re-render durante uma animacao, pode ocorrer um conflito onde:

1. A animacao do Recharts remove/move um elemento do DOM
2. O React tenta remover o mesmo elemento (que ja foi movido)
3. Resultado: `NotFoundError: The node to be removed is not a child of this node`

Desabilitar animacoes (`isAnimationActive={false}`) garante que apenas o React manipule o DOM, eliminando conflitos.

### Por que remover className do CartesianGrid?

O Recharts v2.x tem um bug conhecido onde passar `className` para certos componentes internos (CartesianGrid, XAxis, YAxis) faz com que o componente tente usar refs de forma incorreta. A solucao e usar as props nativas do SVG (`stroke`, `opacity`) ou aplicar estilos via CSS global (que ja e feito pelo ChartContainer).

### Impacto Visual

As animacoes de entrada dos graficos serao removidas, mas isso:
- Melhora significativamente a estabilidade
- Reduz o tempo de renderizacao
- Elimina os erros de console
- Previne paginas em branco

---

## Resultado Esperado

Apos as correcoes:

1. Os warnings de ref desaparecerao do console
2. O erro `NotFoundError: removeChild` sera eliminado
3. A navegacao entre paginas funcionara corretamente
4. Os graficos serao renderizados de forma estavel
5. A pagina de Reports carregara sem erros
