
# Preview de PDFs no Chat do WhatsApp

## Resumo

Atualmente, os PDFs recebidos via WhatsApp aparecem apenas como um link de download. Este plano implementa um preview inline do PDF diretamente no chat, com opção de expandir em tela cheia.

---

## O Que Será Implementado

### 1. Detectar PDFs e Renderizar Preview

Quando o `message_type` for `document` e o `media_mime_type` for `application/pdf`, mostrar um preview inline usando `<iframe>` ao invés do link de download padrão.

### 2. Expandir PDF em Dialog

Um botão "Expandir" permitirá abrir o PDF em um Dialog de tela cheia para melhor visualização.

---

## Visualização Esperada

**Antes (apenas download):**
```text
┌────────────────────────────────────┐
│ [📄] proposta.pdf                  │
│      application/pdf    [⬇️]      │
└────────────────────────────────────┘
```

**Depois (com preview):**
```text
┌────────────────────────────────────┐
│ [PDF Preview - iframe]             │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ │   📄 Documento PDF             │ │
│ │   renderizado inline           │ │
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│ proposta.pdf                       │
│ [🔍 Expandir]  [⬇️ Baixar]        │
└────────────────────────────────────┘
```

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/whatsapp/MessageBubble.tsx` | Adicionar lógica de preview de PDF com iframe e dialog |

---

## Detalhes Técnicos

### Mudanças no MessageBubble.tsx

**1. Adicionar imports necessários:**
```typescript
import { Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
```

**2. Adicionar estado para o dialog do PDF:**
```typescript
const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
```

**3. Criar função helper para detectar PDF:**
```typescript
const isPdfDocument = message.message_type === 'document' && 
  message.media_mime_type?.toLowerCase() === 'application/pdf';
```

**4. Atualizar o case `document` no `renderContent`:**
```typescript
case 'document':
  const fileName = (message.metadata as Record<string, unknown>)?.fileName as string || 'Documento';
  const isPdf = message.media_mime_type?.toLowerCase() === 'application/pdf';
  
  if (isPdf && message.media_url) {
    return (
      <div className="space-y-2">
        {/* Preview inline do PDF */}
        <div className="rounded-lg overflow-hidden border border-border/50 bg-background">
          <iframe
            src={`${message.media_url}#toolbar=0&navpanes=0`}
            className="w-full h-[200px]"
            title={fileName}
          />
        </div>
        
        {/* Nome e ações */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate flex-1">{fileName}</p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setIsPdfDialogOpen(true)}
            >
              <Maximize2 className="h-3.5 w-3.5 mr-1" />
              Expandir
            </Button>
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 h-7 text-xs hover:bg-muted/50 rounded-md transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar
            </a>
          </div>
        </div>

        {/* Dialog para PDF expandido */}
        <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
          <DialogContent className="max-w-4xl h-[90vh] p-0">
            <DialogHeader className="p-4 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {fileName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 p-4 pt-2">
              <iframe
                src={message.media_url}
                className="w-full h-full rounded-lg border"
                title={fileName}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Fallback para outros documentos (não-PDF)
  return (
    <a 
      href={message.media_url || '#'} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-2 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
    >
      {/* ... código existente ... */}
    </a>
  );
```

---

## Considerações de UX

### Preview Inline
- Altura de 200px para não ocupar muito espaço no chat
- Toolbar do PDF oculta (`#toolbar=0`) para visual limpo
- Borda sutil para delimitar o preview

### Dialog Expandido
- 90% da altura da tela para máxima visualização
- Mantém o nome do arquivo no header
- Toolbar do PDF visível para navegação completa

### Fallback
- Outros tipos de documento (Word, Excel, etc.) continuam com o comportamento atual de download
- Se o iframe falhar, o usuário ainda pode baixar o arquivo

---

## Compatibilidade

- ✅ Chrome, Firefox, Edge, Safari suportam preview de PDF em iframe
- ✅ Mobile browsers geralmente suportam (podem abrir em app externo)
- ⚠️ Alguns PDFs protegidos podem não renderizar (fallback disponível)
