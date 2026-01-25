import { useState } from 'react';
import { XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface LostReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

const QUICK_REASONS = [
  { value: 'Preço muito alto', label: 'Preço' },
  { value: 'Perdeu para concorrente', label: 'Concorrente' },
  { value: 'Cliente não respondeu', label: 'Sem resposta' },
  { value: 'Cliente desistiu', label: 'Desistência' },
  { value: 'Timing inadequado', label: 'Timing' },
];

export function LostReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: LostReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);

  const handleQuickSelect = (quickReason: string) => {
    if (selectedQuick === quickReason) {
      setSelectedQuick(null);
      setReason('');
    } else {
      setSelectedQuick(quickReason);
      setReason(quickReason);
    }
  };

  const handleConfirm = () => {
    if (reason.trim().length >= 5) {
      onConfirm(reason.trim());
      // Reset state after confirming
      setReason('');
      setSelectedQuick(null);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setReason('');
      setSelectedQuick(null);
    }
    onOpenChange(open);
  };

  const isValid = reason.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Marcar como Perdido
          </DialogTitle>
          <DialogDescription>
            Por que este negócio foi perdido? Essa informação é importante para análises futuras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick reasons */}
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((quick) => (
              <Button
                key={quick.value}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'transition-colors',
                  selectedQuick === quick.value &&
                    'border-destructive/50 bg-destructive/10 text-destructive'
                )}
                onClick={() => handleQuickSelect(quick.value)}
              >
                {quick.label}
              </Button>
            ))}
          </div>

          {/* Detailed reason */}
          <div className="space-y-2">
            <Textarea
              placeholder="Descreva o motivo da perda em detalhes..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value !== selectedQuick) {
                  setSelectedQuick(null);
                }
              }}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mínimo 5 caracteres</span>
              <span>{reason.length}/500</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Salvando...' : 'Confirmar Perda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
