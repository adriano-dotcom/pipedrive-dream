

# Plano: Botão de Email no Card do Sócio

## Objetivo

Adicionar um botão para enviar email diretamente do card do sócio, utilizando o sistema de emails já existente no CRM (componente `EmailButton`).

## Análise do Sistema Existente

O projeto já possui:
- `EmailButton` - Componente reutilizável que abre o compositor de email
- `EmailComposerDialog` - Dialog completo com suporte a templates, IA e assinaturas
- Sistema de envio via edge function `send-email`
- Registro de emails enviados na tabela `sent_emails`

O `EmailButton` aceita:
- `entityType`: 'deal' | 'person' | 'organization'
- `entityId`: ID da entidade para vincular o email
- `entityName`: Nome para exibição
- `recipientEmail`: Email do destinatário
- `recipientName`: Nome do destinatário

## Implementação

### Alterações Necessárias

| Arquivo | Alteração |
|---------|-----------|
| `src/components/organizations/detail/PartnerCard.tsx` | Adicionar prop `organizationId` e botão de email |
| `src/components/organizations/detail/OrganizationPartners.tsx` | Passar `organizationId` para o `PartnerCard` |

### Interface do PartnerCard Atualizada

```typescript
interface PartnerCardProps {
  partner: OrganizationPartner;
  linkedPerson: OrganizationPerson | undefined;
  organizationId: string;  // Nova prop
  onEditClick: (partner: OrganizationPartner) => void;
  onConvertClick: (partner: OrganizationPartner) => void;
  onLinkClick: (partner: OrganizationPartner) => void;
  onUnlinkClick: (personId: string) => void;
  isUnlinking: boolean;
}
```

### Posicionamento do Botão

O botão de email será exibido ao lado do email do sócio na seção de contato:

```text
📞 CONTATO
┌──────────────────────────────────────────────────────┐
│ 📧 wagner@empresa.com [✉️]  ← Botão para enviar email│
│ 📞 (11) 99999-9999                                   │
│ 💬 (11) 99999-9999 →                                 │
└──────────────────────────────────────────────────────┘
```

### Código do Botão

```tsx
import { EmailButton } from '@/components/email/EmailButton';

{partner.email && (
  <div className="flex items-center gap-1">
    <span className="flex items-center gap-1">
      <Mail className="h-3 w-3" />
      {partner.email}
    </span>
    <EmailButton
      entityType="organization"
      entityId={organizationId}
      entityName={partner.name}
      recipientEmail={partner.email}
      recipientName={partner.name}
      size="icon"
    />
  </div>
)}
```

## Comportamento

1. Usuário vê o email do sócio no card
2. Ao lado do email, há um ícone de envelope clicável
3. Ao clicar, abre o compositor de email:
   - **Para**: Email do sócio (preenchido)
   - **Nome destinatário**: Nome do sócio
   - **Vinculado a**: Organização (para histórico)
4. Usuário pode usar templates ou IA para gerar o email
5. Email é enviado e registrado na organização

## Resultado Esperado

- Botão de email discreto ao lado do endereço de email
- Abre o compositor completo com destinatário preenchido
- Emails enviados são registrados na aba "Emails" da organização
- Mantém consistência visual com os outros elementos do card

