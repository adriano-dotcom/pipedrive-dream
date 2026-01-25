import { SentEmailsList } from '@/components/email/SentEmailsList';

interface OrganizationEmailsProps {
  organizationId: string;
  organizationName: string;
  recipientEmail?: string;
}

export function OrganizationEmails({
  organizationId,
  organizationName,
  recipientEmail,
}: OrganizationEmailsProps) {
  return (
    <SentEmailsList
      entityType="organization"
      entityId={organizationId}
      entityName={organizationName}
      recipientEmail={recipientEmail}
      recipientName={organizationName}
    />
  );
}
