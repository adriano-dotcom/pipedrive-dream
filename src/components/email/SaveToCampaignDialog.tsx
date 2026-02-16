import { useState } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBulkEmail } from '@/hooks/useBulkEmail';

interface Recipient {
  person_id: string;
  email: string;
  name: string;
  organization_name?: string | null;
  organization_city?: string | null;
  job_title?: string | null;
}

interface SaveToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
  onSuccess?: () => void;
}

export function SaveToCampaignDialog({ open, onOpenChange, recipients, onSuccess }: SaveToCampaignDialogProps) {
  const { saveDraftCampaign, isSavingDraft } = useBulkEmail();
  const [name, setName] = useState('');

  const handleSave = async () => {
    if (!name.trim() || recipients.length === 0) return;

    await saveDraftCampaign({ name: name.trim(), recipients });
    setName('');
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            Salvar em Campanha
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da campanha</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Prospecção Janeiro 2026"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {recipients.length} destinatário(s) serão salvos nesta campanha. Você poderá escrever e enviar o e-mail depois em <strong>Campanhas</strong>.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSavingDraft}>
              {isSavingDraft ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bookmark className="h-4 w-4 mr-2" />}
              Salvar Rascunho
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
