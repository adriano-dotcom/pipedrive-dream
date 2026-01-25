import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  StickyNote, 
  Pin, 
  PinOff, 
  Trash2, 
  Loader2,
  Send,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OrganizationNote } from '@/hooks/useOrganizationDetails';

interface OrganizationNotesProps {
  notes: OrganizationNote[];
  onAddNote: (content: string) => void;
  onTogglePin: (noteId: string, isPinned: boolean) => void;
  onDeleteNote: (noteId: string) => void;
  isAdding: boolean;
}

export function OrganizationNotes({ 
  notes, 
  onAddNote, 
  onTogglePin, 
  onDeleteNote,
  isAdding,
}: OrganizationNotesProps) {
  const [newNote, setNewNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(newNote.trim());
    setNewNote('');
  };

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <Card className="glass border-border/50">
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              placeholder="Adicione uma nota sobre esta organização..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] resize-none bg-background/50"
            />
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!newNote.trim() || isAdding}
                size="sm"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Adicionar Nota
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <StickyNote className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">Nenhuma nota ainda</h3>
            <p className="text-sm text-muted-foreground">
              Adicione sua primeira nota sobre esta organização
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card 
              key={note.id} 
              className={`glass border-border/50 transition-all ${
                note.is_pinned ? 'border-primary/30 bg-primary/5' : ''
              }`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      {note.profile && (
                        <span>{note.profile.full_name}</span>
                      )}
                      <span>•</span>
                      <span>
                        {format(new Date(note.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </span>
                      <span className="text-muted-foreground/60">
                        ({formatDistanceToNow(new Date(note.created_at), { locale: ptBR, addSuffix: true })})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onTogglePin(note.id, note.is_pinned)}
                    >
                      {note.is_pinned ? (
                        <PinOff className="h-4 w-4 text-primary" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDeleteNote(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
