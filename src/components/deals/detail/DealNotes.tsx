import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pin, Trash2, Send, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DealNote } from '@/hooks/useDealDetails';

interface DealNotesProps {
  notes: DealNote[];
  onAddNote: (content: string) => void;
  onTogglePin: (params: { noteId: string; isPinned: boolean }) => void;
  onDeleteNote: (noteId: string) => void;
  isAdding?: boolean;
}

export function DealNotes({ 
  notes, 
  onAddNote, 
  onTogglePin, 
  onDeleteNote,
  isAdding 
}: DealNotesProps) {
  const [newNote, setNewNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Escreva uma nota..."
          className="min-h-[80px] resize-none bg-background/50"
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newNote.trim() || isAdding}
          >
            <Send className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </form>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <StickyNote className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhuma nota ainda</p>
          <p className="text-sm text-muted-foreground/70">Adicione notas para acompanhar este negócio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note, index) => (
            <div 
              key={note.id}
              className={cn(
                "relative p-4 rounded-lg border transition-all",
                "bg-card/50 hover:bg-card/80",
                note.is_pinned && "border-amber-500/30 bg-amber-500/5",
                "animate-in fade-in slide-in-from-bottom-2"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {note.is_pinned && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-amber-500 text-amber-950 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Pin className="h-3 w-3" />
                    Fixada
                  </div>
                </div>
              )}

              <p className="text-sm whitespace-pre-wrap text-foreground">
                {note.content}
              </p>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  {format(new Date(note.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  {note.profile?.full_name && (
                    <span> • {note.profile.full_name}</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onTogglePin({ noteId: note.id, isPinned: note.is_pinned })}
                  >
                    <Pin className={cn(
                      "h-3.5 w-3.5",
                      note.is_pinned ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteNote(note.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
