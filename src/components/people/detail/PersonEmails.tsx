import { SentEmailsList } from '@/components/email/SentEmailsList';

interface PersonEmailsProps {
  personId: string;
  personName: string;
  recipientEmail?: string;
  organizationId?: string;
}

export function PersonEmails({
  personId,
  personName,
  recipientEmail,
  organizationId,
}: PersonEmailsProps) {
  return (
    <SentEmailsList
      entityType="person"
      entityId={personId}
      entityName={personName}
      recipientEmail={recipientEmail}
      recipientName={personName}
      organizationId={organizationId}
    />
  );
}
