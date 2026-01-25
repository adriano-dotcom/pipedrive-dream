import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmailComposerDialog } from './EmailComposerDialog';

interface EmailButtonProps {
  entityType: 'deal' | 'person' | 'organization';
  entityId: string;
  entityName: string;
  recipientEmail?: string;
  recipientName?: string;
  variant?: 'icon' | 'default';
  size?: 'default' | 'sm' | 'icon';
}

export function EmailButton({
  entityType,
  entityId,
  entityName,
  recipientEmail,
  recipientName,
  variant = 'icon',
  size = 'icon',
}: EmailButtonProps) {
  const [composerOpen, setComposerOpen] = useState(false);

  if (!recipientEmail) return null;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={size}
              className={size === 'icon' ? 'h-7 w-7' : ''}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setComposerOpen(true);
              }}
            >
              <Mail className="h-4 w-4" />
              {variant === 'default' && <span className="ml-2">Enviar E-mail</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Enviar e-mail</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <EmailComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        recipientEmail={recipientEmail}
        recipientName={recipientName}
      />
    </>
  );
}
