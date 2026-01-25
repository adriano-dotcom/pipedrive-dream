import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { OrganizationForm } from './OrganizationForm';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

interface OrganizationFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization | null;
}

export function OrganizationFormSheet({
  open,
  onOpenChange,
  organization,
}: OrganizationFormSheetProps) {
  const handleClose = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {organization ? 'Editar Organização' : 'Nova Organização'}
          </SheetTitle>
          <SheetDescription>
            {organization 
              ? 'Atualize as informações da organização abaixo.'
              : 'Preencha os dados para criar uma nova organização.'
            }
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <OrganizationForm
            organization={organization}
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
