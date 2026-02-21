
# Converter Formulario de Atividades para Dialog Centralizado

## O que sera feito

Aplicar a mesma transformacao feita no formulario de negocios: converter o `ActivityFormSheet` de um Sheet lateral para um Dialog centralizado na tela, com visual mais amigavel e fluido.

## Mudancas

### ActivityFormSheet.tsx

1. **Substituir imports** (linhas 13-18): trocar `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` por `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`

2. **Substituir wrapper JSX** (linhas 263-265 e 568-569):
   - `Sheet` -> `Dialog`
   - `SheetContent className="w-full sm:max-w-lg overflow-y-auto"` -> `DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto"`
   - `SheetHeader`/`SheetTitle` -> `DialogHeader`/`DialogTitle` + adicionar `DialogDescription`

3. Toda a logica interna do formulario permanece identica

### Detalhes tecnicos

```tsx
// De:
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
    <SheetHeader>
      <SheetTitle>...</SheetTitle>
    </SheetHeader>
    ...
  </SheetContent>
</Sheet>

// Para:
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    ...
  </DialogContent>
</Dialog>
```

## Resultado esperado
- O formulario de atividades abre centralizado na tela como um modal
- Largura responsiva (95vw no mobile, max 672px no desktop)
- Scroll interno quando o conteudo excede 85% da altura
- Visual consistente com o formulario de negocios ja convertido
