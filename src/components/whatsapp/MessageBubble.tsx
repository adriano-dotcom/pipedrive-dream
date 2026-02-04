import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, FileText, MapPin, Download, Play, Pause, Maximize2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { WhatsAppMessage } from '@/hooks/useWhatsAppMessages';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MessageBubbleProps {
  message: WhatsAppMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isFromContact = message.sender_type === 'contact';
  const isSystem = message.sender_type === 'system';

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm', { locale: ptBR });
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'read':
        return <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />;
      case 'delivered':
        return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'failed':
        return <span className="text-xs text-destructive">Falhou</span>;
      default:
        return null;
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // System message
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1.5 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <a href={message.media_url} target="_blank" rel="noopener noreferrer">
                <img 
                  src={message.media_url} 
                  alt="Imagem" 
                  className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            )}
            {message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <button 
              onClick={toggleAudio}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
            <div className="flex-1 h-1 bg-muted-foreground/30 rounded-full">
              <div className="h-full w-0 bg-emerald-500 rounded-full" />
            </div>
            {message.media_url && (
              <audio 
                ref={audioRef} 
                src={message.media_url}
                onEnded={() => setIsPlaying(false)}
              />
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <video 
                src={message.media_url} 
                controls 
                className="max-w-[280px] rounded-lg"
              />
            )}
            {message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
          </div>
        );

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
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                  <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {fileName}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 p-4 pt-2 min-h-0">
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
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">{message.media_mime_type || 'Documento'}</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        );

      case 'location':
        const lat = (message.metadata as Record<string, unknown>)?.latitude;
        const lng = (message.metadata as Record<string, unknown>)?.longitude;
        return (
          <a 
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Ver localização</span>
          </a>
        );

      case 'sticker':
        return message.media_url ? (
          <img 
            src={message.media_url} 
            alt="Sticker" 
            className="max-w-[120px]"
          />
        ) : null;

      case 'contact':
        const contactName = (message.metadata as Record<string, unknown>)?.name as string || 'Contato';
        return (
          <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
              {contactName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm">{contactName}</span>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
    }
  };

  return (
    <div className={cn(
      'flex',
      isFromContact ? 'justify-start' : 'justify-end'
    )}>
      <div className={cn(
        'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
        isFromContact 
          ? 'bg-muted rounded-bl-md' 
          : 'bg-emerald-500/10 dark:bg-emerald-500/20 rounded-br-md'
      )}>
        {/* Sender name for agent messages */}
        {!isFromContact && message.profile?.full_name && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
            {message.profile.full_name}
          </p>
        )}
        
        {renderContent()}
        
        {/* Timestamp and status */}
        <div className={cn(
          'flex items-center gap-1.5 mt-1',
          isFromContact ? 'justify-start' : 'justify-end'
        )}>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
          {!isFromContact && getStatusIcon()}
        </div>
      </div>
    </div>
  );
}
