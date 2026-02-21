
# Transformar Formulario de Negocio em Dialog Centralizado

## O que sera feito

Converter o formulario de criacao/edicao de negocios de um Sheet lateral (painel deslizante da direita) para um Dialog centralizado na tela, com visual mais amigavel e fluido, seguindo a estetica iOS Liquid Glass do projeto.

## Mudancas

### 1. DealFormSheet.tsx - Converter Sheet para Dialog
- Substituir os imports de `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` pelos equivalentes de `Dialog`: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- Alterar o wrapper de `Sheet` para `Dialog` e de `SheetContent` para `DialogContent`
- Aplicar classes para o Dialog ficar mais largo (`max-w-2xl`) e com scroll interno (`max-h-[85vh] overflow-y-auto`)
- Manter toda a logica interna do formulario exatamente igual (queries, mutations, form fields)

### Detalhes tecnicos

No arquivo `src/components/deals/DealFormSheet.tsx`:

1. Substituir imports (linhas 18-24):
```tsx
// De:
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
// Para:
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
```

2. Substituir o wrapper JSX (linhas 440-441 e 919-936):
```tsx
// De:
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent className="sm:max-w-lg overflow-y-auto">
    <SheetHeader>
      <SheetTitle>...</SheetTitle>
      <SheetDescription>...</SheetDescription>
    </SheetHeader>
    ...
  </SheetContent>
</Sheet>

// Para:
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    ...
  </DialogContent>
</Dialog>
```

3. Mover o `AlertDialog` de confirmacao de troca de funil para fora do `Dialog`, pois dialogs aninhados podem causar problemas de z-index. Envolver ambos em um Fragment `<>`.

## Resultado esperado
- O formulario abre centralizado na tela como um modal
- Largura maior (max-w-2xl / ~672px) permite visualizar melhor os campos em grid 2 colunas
- Scroll interno quando o conteudo excede 85% da altura da viewport
- Visual com glass blur consistente com o resto da aplicacao
- Toda a funcionalidade existente (criar, editar, ganho/perdido, excluir) continua funcionando normalmente
