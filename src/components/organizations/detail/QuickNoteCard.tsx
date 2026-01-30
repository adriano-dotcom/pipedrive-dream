import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Send, Loader2, StickyNote } from 'lucide-react';
import { useMentionNotifications } from '@/hooks/useMentionNotifications';

interface QuickNoteCardProps {
  organizationId: string;
  organizationName: string;
  onAddNote: (content: string) => void;
  isAdding: boolean;
}

export function QuickNoteCard({
  organizationId,
  organizationName,
  onAddNote,
  isAdding,
}: QuickNoteCardProps) {
  const [newNote, setNewNote] = useState('');
  const { sendMentionNotifications } = useMentionNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const textContent = newNote.replace(/<[^>]*>/g, '').trim();
    if (!textContent) return;
    
    onAddNote(newNote);
    
    // Send mention notifications in background
    sendMentionNotifications({
      noteContent: newNote,
      entityType: 'organization',
      entityId: organizationId,
      entityName: organizationName,
    });
    
    setNewNote('');
  };

  return (
    <Card className="glass border-border/50">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <StickyNote className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium">Nota Rápida</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <RichTextEditor
            content={newNote}
            onChange={setNewNote}
            placeholder="Adicione uma nota sobre esta organização..."
            minHeight="80px"
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={!newNote.replace(/<[^>]*>/g, '').trim() || isAdding}
              size="sm"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Adicionar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
