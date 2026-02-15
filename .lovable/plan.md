
# Melhorar Layout do EmailComposerDialog

## Problemas Atuais
- O dialog inteiro usa um unico scroll (`overflow-y-auto` no DialogContent), misturando campos de formulario com o corpo do email
- O resumo da pesquisa nao tem scroll proprio e fica muito longo
- O layout e linear e denso, sem separacao visual clara entre secoes

## Alteracoes

### 1. Reestruturar o layout do `EmailComposerDialog.tsx`
- **Cabecalho compacto**: De/Para lado a lado em uma unica linha (grid 2 colunas) para economizar espaco vertical
- **Acoes rapidas**: Manter modelo + tipo + botao IA em uma barra horizontal compacta
- **Secao de pesquisa IA**: Melhorar visualmente com icone maior, gradiente sutil, e limitar a altura do resumo com `ScrollArea` (max ~150px com scroll)
- **Editor de mensagem**: Dar mais destaque, aumentar altura minima e usar `flex-1` para ocupar espaco disponivel
- **Assinatura**: Manter preview compacto
- **Rodape**: Botoes fixos no final

### 2. Adicionar `ScrollArea` ao resumo da pesquisa
- O `researchSummary` e as `citations` ficarao dentro de um `ScrollArea` com `max-h-[200px]` para nao empurrar o resto do formulario para baixo

### 3. Melhorias visuais
- Secao de pesquisa com borda e fundo mais destacados
- Labels menores e mais discretos
- Campos De/Para em grid compacto
- Botao de enviar com mais destaque visual

### Detalhes Tecnicos

**Arquivo modificado:** `src/components/email/EmailComposerDialog.tsx`

Principais mudancas:
- Importar `ScrollArea` de `@/components/ui/scroll-area`
- Campos De/Para em `grid grid-cols-2 gap-4` (ou empilhados no mobile)
- Resumo da pesquisa envolto em `ScrollArea` com `className="max-h-[200px]"`
- Citations em lista horizontal com chips/badges ao inves de links verticais longos
- Editor de mensagem com `minHeight="250px"` ao inves de 200px
- DialogContent com padding mais organizado
