import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle } from 'lucide-react';

interface LinkedInfo {
  deals: number;
  activities: number;
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  itemName?: string;
  itemCount?: number;
  onConfirm: () => void;
  isDeleting?: boolean;
  linkedInfo?: LinkedInfo | null;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  itemCount,
  onConfirm,
  isDeleting = false,
  linkedInfo,
}: DeleteConfirmDialogProps) {
  const hasLinks = linkedInfo && (linkedInfo.deals > 0 || linkedInfo.activities > 0);
  
  const renderDescription = () => {
    // If custom description is provided, use it
    if (description) {
      return description;
    }
    
    // If has linked records, show warning
    if (hasLinks) {
      return (
        <div className="space-y-3">
          <p>
            <span className="font-medium text-foreground">"{itemName}"</span> está vinculado a:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {linkedInfo.deals > 0 && (
              <li>{linkedInfo.deals} {linkedInfo.deals === 1 ? 'negócio' : 'negócios'}</li>
            )}
            {linkedInfo.activities > 0 && (
              <li>{linkedInfo.activities} {linkedInfo.activities === 1 ? 'atividade' : 'atividades'}</li>
            )}
          </ul>
          <p className="text-sm">
            Ao excluir, esses registros perderão a referência a esta pessoa e ficarão sem pessoa de contato vinculada. Esta ação não pode ser desfeita.
          </p>
        </div>
      );
    }
    
    // Default description for batch or single delete
    if (itemCount && itemCount > 1) {
      return (
        <>
          Tem certeza que deseja excluir{' '}
          <span className="font-medium text-foreground">
            {itemCount} organizações
          </span>
          ? Esta ação não pode ser desfeita.
        </>
      );
    }
    
    return (
      <>
        Tem certeza que deseja excluir{' '}
        {itemName && (
          <span className="font-medium text-foreground">"{itemName}"</span>
        )}
        ? Esta ação não pode ser desfeita.
      </>
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg">
              {hasLinks ? 'Atenção: Esta pessoa possui vínculos' : title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild className="pt-2">
            <div>{renderDescription()}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : hasLinks ? (
              'Excluir mesmo assim'
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}