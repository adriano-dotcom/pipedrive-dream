import { Check, XCircle, Loader2, FileCheck, Building2, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImportResult {
  success: boolean;
  name: string;
  type: 'person' | 'organization';
  error?: string;
  action?: 'created' | 'updated';
}

interface ImportStepProgressProps {
  isImporting: boolean;
  progress: number;
  results: ImportResult[];
  totalRows: number;
  onClose: () => void;
}

export function ImportStepProgress({
  isImporting,
  progress,
  results,
  totalRows,
  onClose,
}: ImportStepProgressProps) {
  const stats = {
    peopleCreated: results.filter(r => r.type === 'person' && r.success && r.action === 'created').length,
    peopleUpdated: results.filter(r => r.type === 'person' && r.success && r.action === 'updated').length,
    orgsCreated: results.filter(r => r.type === 'organization' && r.success && r.action === 'created').length,
    orgsUpdated: results.filter(r => r.type === 'organization' && r.success && r.action === 'updated').length,
    errors: results.filter(r => !r.success).length,
  };

  const isComplete = !isImporting && results.length > 0;
  const hasErrors = stats.errors > 0;

  return (
    <div className="space-y-6">
      {/* Progress Section */}
      {isImporting && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg font-medium">Importando dados...</span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <p className="text-center text-sm text-muted-foreground">
            {results.length} de {totalRows} registros processados
          </p>
        </div>
      )}

      {/* Complete Section */}
      {isComplete && (
        <>
          {/* Success Header */}
          <div className="flex flex-col items-center gap-4 py-4">
            <div className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              hasErrors ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
            )}>
              {hasErrors ? (
                <FileCheck className="h-8 w-8 text-amber-600" />
              ) : (
                <Check className="h-8 w-8 text-emerald-600" />
              )}
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold">
                {hasErrors ? 'Importação concluída com alertas' : 'Importação concluída!'}
              </h3>
              <p className="text-muted-foreground mt-1">
                {results.filter(r => r.success).length} registros processados com sucesso
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.peopleCreated + stats.peopleUpdated}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.peopleCreated} criados, {stats.peopleUpdated} atualizados
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.orgsCreated + stats.orgsUpdated}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.orgsCreated} criados, {stats.orgsUpdated} atualizados
                </p>
              </div>
            </div>
          </div>

          {/* Error List */}
          {hasErrors && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                {stats.errors} erro(s) durante a importação:
              </p>
              <ScrollArea className="h-[120px] rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="space-y-2">
                  {results
                    .filter(r => !r.success)
                    .map((result, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>{result.name}</strong>: {result.error}
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-center pt-4">
            <Button onClick={onClose} size="lg">
              Concluir
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
