
# Melhorar Contraste e Rolagem no Compositor de Email

## Problemas na Screenshot
1. O texto do email no editor rico tem baixo contraste (texto claro sobre fundo escuro)
2. A area de assinatura tambem tem contraste fraco (`bg-muted/30` com texto `text-muted-foreground`)
3. Nao ha barra de rolagem visivel na area do email para facilitar navegacao em textos longos

## Alteracoes

### Arquivo: `src/components/email/EmailComposerDialog.tsx`

**1. Assinatura - melhorar contraste e adicionar scroll:**
- Trocar `bg-muted/30` por `bg-card border border-border` para melhor contraste
- Trocar `text-muted-foreground` por `text-foreground` no container
- Envolver o conteudo da assinatura em `ScrollArea` com `max-h-[120px]` para assinaturas longas
- Trocar `text-xs` do conteudo por `text-sm` para melhor legibilidade

**2. Editor de mensagem - melhorar contraste:**
- Adicionar classe ao container do `RichTextEditor` para garantir texto com contraste adequado (`text-foreground`)

### Arquivo: `src/components/ui/rich-text-editor.tsx` (se necessario)
- Verificar se o editor ja aplica `text-foreground` ou se precisa de ajuste no CSS do `.ProseMirror`

### Detalhes Tecnicos

Linha 304-308 atual:
```text
<div className="text-sm text-muted-foreground border-t border-border/50 pt-3">
  <p className="mb-1.5 text-xs font-medium">Assinatura (adicionada automaticamente):</p>
  <div className="text-xs bg-muted/30 p-2.5 rounded-lg" dangerouslySetInnerHTML=.../>
</div>
```

Sera alterado para:
```text
<div className="text-sm text-foreground border-t border-border pt-3">
  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Assinatura (adicionada automaticamente):</p>
  <ScrollArea className="max-h-[130px]">
    <div className="text-sm bg-card border border-border p-3 rounded-lg" dangerouslySetInnerHTML=.../>
  </ScrollArea>
</div>
```

### Resumo
- Melhor contraste no texto da assinatura e do email
- Barra de rolagem na assinatura para textos longos
- O ScrollArea principal do dialog ja existe e cobre o conteudo todo incluindo o editor
