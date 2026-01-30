
# Adicionar Tooltips nos Badges de Tendência

## Objetivo
Melhorar a experiência do usuário adicionando tooltips explicativos nos badges de tendência dos KPIs do Dashboard, indicando claramente o período de comparação ("vs. mês anterior").

---

## Mudança a Realizar

### Arquivo: `src/pages/Dashboard.tsx`

1. **Importar componentes de Tooltip**
   - Adicionar import de `Tooltip`, `TooltipContent`, `TooltipTrigger`, `TooltipProvider` de `@/components/ui/tooltip`

2. **Envolver o Dashboard com TooltipProvider**
   - O provider é necessário para que os tooltips funcionem corretamente

3. **Adicionar Tooltips aos Badges**
   - Envolver cada badge de tendência com `<Tooltip>`, `<TooltipTrigger>` e `<TooltipContent>`
   - Texto do tooltip: **"Comparado ao mês anterior"**

---

## Exemplo Visual

```text
Antes:
┌────────────────────┐
│ Organizações       │
│ 45  [+12%]         │ ← Badge sem explicação
│ empresas cadastradas│
└────────────────────┘

Depois:
┌────────────────────┐
│ Organizações       │
│ 45  [+12%]         │ ← Badge com tooltip
│ empresas cadastradas│   "Comparado ao mês anterior"
└────────────────────┘
```

---

## Detalhes Técnicos

A modificação será feita no componente `StatCard` interno do Dashboard:

- Linha 60-75: Badge para tendência positiva/negativa - envolver com Tooltip
- Linha 77-81: Badge para tendência neutra - envolver com Tooltip

O texto do tooltip será consistente para todos os badges: **"Comparado ao mês anterior"**

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Dashboard.tsx` | Adicionar imports e envolver badges com Tooltip |
