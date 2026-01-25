import { SentEmailsList } from '@/components/email/SentEmailsList';

interface PersonEmailsProps {
  personId: string;
  personName: string;
  recipientEmail?: string;
}

export function PersonEmails({
  personId,
  personName,
  recipientEmail,
}: PersonEmailsProps) {
  return (
    <SentEmailsList
      entityType="person"
      entityId={personId}
      entityName={personName}
      recipientEmail={recipientEmail}
      recipientName={personName}
    />
  );
}
