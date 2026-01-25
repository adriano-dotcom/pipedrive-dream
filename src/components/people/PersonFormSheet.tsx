import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { PersonForm } from './PersonForm';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface PersonFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person | null;
  onSuccess?: () => void;
}

export function PersonFormSheet({
  open,
  onOpenChange,
  person,
  onSuccess,
}: PersonFormSheetProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {person ? 'Editar Pessoa' : 'Nova Pessoa'}
          </SheetTitle>
          <SheetDescription>
            {person 
              ? 'Atualize as informações da pessoa abaixo.'
              : 'Preencha os dados para criar uma nova pessoa.'
            }
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <PersonForm
            person={person}
            onSuccess={handleSuccess}
            onCancel={handleClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
