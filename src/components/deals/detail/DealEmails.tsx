import { SentEmailsList } from '@/components/email/SentEmailsList';

interface DealEmailsProps {
  dealId: string;
  dealTitle: string;
  recipientEmail?: string;
  recipientName?: string;
}

export function DealEmails({
  dealId,
  dealTitle,
  recipientEmail,
  recipientName,
}: DealEmailsProps) {
  return (
    <SentEmailsList
      entityType="deal"
      entityId={dealId}
      entityName={dealTitle}
      recipientEmail={recipientEmail}
      recipientName={recipientName}
    />
  );
}
