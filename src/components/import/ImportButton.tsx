import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImportDialog } from './ImportDialog';

interface ImportButtonProps {
  defaultType?: 'people' | 'organizations';
}

export function ImportButton({ defaultType }: ImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="shadow-sm"
      >
        <Upload className="mr-2 h-4 w-4" />
        Importar
      </Button>

      <ImportDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        defaultType={defaultType}
      />
    </>
  );
}
