import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useBulkEnrichOrganizations } from '@/hooks/useBulkEnrichOrganizations';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrganizationToEnrich {
  id: string;
  name: string;
  cnpj: string;
}

interface BulkEnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: OrganizationToEnrich[];
  onComplete?: () => void;
}

export function BulkEnrichDialog({
  open,
  onOpenChange,
  organizations,
  onComplete,
}: BulkEnrichDialogProps) {
  const {
    isRunning,
    isComplete,
    total,
    current,
    currentOrg,
    successCount,
    errorCount,
    errors,
    startBulkEnrich,
    cancel,
    reset,
  } = useBulkEnrichOrganizations();

  // Start enrichment when dialog opens
  useEffect(() => {
    if (open && organizations.length > 0 && !isRunning && !isComplete) {
      startBulkEnrich(organizations);
    }
  }, [open, organizations, isRunning, isComplete, startBulkEnrich]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Small delay to allow animation to complete
      const timer = setTimeout(() => {
        reset();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, reset]);

  const handleClose = () => {
    if (isComplete) {
      onComplete?.();
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    cancel();
  };

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={isRunning ? undefined : onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md" onPointerDownOutside={(e) => isRunning && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRunning && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {isComplete && successCount > 0 && errorCount === 0 && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {isComplete && errorCount > 0 && (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            {isComplete ? 'Atualização Concluída' : 'Atualizar via Receita Federal'}
          </DialogTitle>
          {isRunning && (
            <DialogDescription>
              Processando {current} de {total} organizações...
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progress)}%
            </p>
          </div>

          {/* Current organization being processed */}
          {isRunning && currentOrg && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Atualizando:</p>
              <p className="font-medium truncate">{currentOrg}</p>
            </div>
          )}

          {/* Results summary */}
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {successCount} {successCount === 1 ? 'atualizada' : 'atualizadas'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm">
                {errorCount} com {errorCount === 1 ? 'erro' : 'erros'}
              </span>
            </div>
          </div>

          {/* Error list */}
          {isComplete && errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Erros encontrados:</p>
              <ScrollArea className="h-[120px] rounded-md border p-2">
                <ul className="space-y-1 text-sm">
                  {errors.map((err, index) => (
                    <li key={index} className="flex items-start gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="font-medium">{err.orgName}:</strong>{' '}
                        <span className="text-muted-foreground">{err.error}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {isRunning ? (
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          ) : (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
