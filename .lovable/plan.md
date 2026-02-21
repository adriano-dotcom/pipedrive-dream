
# Corrigir Erro no Dashboard da Versao Publicada

## Diagnostico

O erro "Algo deu errado" aparece apenas na versao **publicada** (pipedrive-dream.lovable.app). A versao de preview funciona perfeitamente. Isso indica que a versao publicada esta rodando codigo antigo que nao foi atualizado.

Alem disso, existe um warning no console sobre refs no componente `StatCard` que pode causar problemas em ambientes de producao mais restritos:
- O `TooltipTrigger` com `asChild` tenta passar um ref para o componente `Tooltip`, mas o `Tooltip` do Radix UI e um function component sem `forwardRef`
- Embora seja apenas um warning, em builds de producao otimizados isso pode causar erros fatais em alguns casos

## Solucao

### 1. Republicar o projeto
- A principal acao e republicar para que a versao publicada receba o codigo mais recente que ja funciona no preview

### 2. Corrigir warning de refs no StatCard (`src/pages/Dashboard.tsx`)
- O `TooltipTrigger asChild` precisa de um filho que aceite refs
- O `Badge` ja tem `forwardRef`, mas o `Tooltip` wrapper pode causar conflito em certas versoes
- Envolver o `Badge` dentro do `TooltipTrigger` com um `<span>` para garantir compatibilidade de refs em todos os ambientes

### Detalhes tecnicos

No arquivo `src/pages/Dashboard.tsx`, nas linhas 62-97, onde o `TooltipTrigger asChild` envolve o `Badge`, adicionar um wrapper `<span>` para garantir que o ref seja passado corretamente:

```tsx
// Antes (pode causar warning/erro de ref):
<TooltipTrigger asChild>
  <Badge ...>...</Badge>
</TooltipTrigger>

// Depois (ref passado corretamente):
<TooltipTrigger asChild>
  <span>
    <Badge ...>...</Badge>
  </span>
</TooltipTrigger>
```

Essa mudanca sera aplicada em 2 pontos do StatCard (linhas 63-83 e 87-96).

## Resultado esperado
- O warning de refs desaparece completamente
- O Dashboard funciona sem erros tanto no preview quanto na versao publicada
- Apos republicar, a versao publicada tera o codigo atualizado e funcional
