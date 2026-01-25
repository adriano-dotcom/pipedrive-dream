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
}

export function PersonFormSheet({
  open,
  onOpenChange,
  person,
}: PersonFormSheetProps) {
  const handleClose = () => onOpenChange(false);

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
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
