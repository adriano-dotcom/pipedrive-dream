import { useState } from 'react';
import { AlertTriangle, Undo2, X } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MergeBackup } from '@/hooks/useMergeBackups';

interface MergeUndoBannerProps {
  backup: MergeBackup;
  entityName: string;
  onUndo: (backupId: string) => Promise<unknown>;
  isUndoing: boolean;
}

export function MergeUndoBanner({
  backup,
  entityName,
  onUndo,
  isUndoing,
}: MergeUndoBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const deletedName = backup.deleted_entity_data?.name || 'registro desconhecido';
  const mergedAt = new Date(backup.created_at);
  const expiresAt = new Date(backup.expires_at);
  const daysRemaining = differenceInDays(expiresAt, new Date());

  return (
    <Alert className="border-warning/50 bg-warning/10 relative">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
        <div className="space-y-1">
          <p className="text-sm">
            <strong>{entityName}</strong> foi mesclado com <strong>"{deletedName}"</strong>{' '}
            {formatDistanceToNow(mergedAt, { addSuffix: true, locale: ptBR })}.
          </p>
          <p className="text-xs text-muted-foreground">
            O backup expira em {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}. 
            Após esse período, não será possível desfazer.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUndo(backup.id)}
          disabled={isUndoing}
          className="shrink-0"
        >
          <Undo2 className="h-4 w-4 mr-1.5" />
          {isUndoing ? 'Desfazendo...' : 'Desfazer mesclagem'}
        </Button>
      </AlertDescription>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
