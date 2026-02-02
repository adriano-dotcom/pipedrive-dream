

# Plano: Campo de Observações Pessoais no Card do Sócio

## Objetivo

Adicionar um campo de observações pessoais (`notes`) no card do sócio para anotações rápidas, permitindo que o usuário registre informações relevantes diretamente no card.

## Análise Atual

A tabela `organization_partners` não possui um campo de notas. As colunas atuais são:
- id, organization_id, name, document, qualification, qualification_code
- entry_date, country, legal_rep_name, legal_rep_document, legal_rep_qualification
- email, phone, job_title, whatsapp, created_at, updated_at

## Implementação

### 1. Migração do Banco de Dados

Adicionar coluna `notes` na tabela `organization_partners`:

```sql
ALTER TABLE organization_partners
ADD COLUMN notes text DEFAULT NULL;
```

### 2. Interface Visual

Adicionar uma seção colapsável de notas no card do sócio, que permite:
- Visualizar nota existente (se houver)
- Adicionar/editar nota inline com um clique
- Salvar automaticamente ao sair do campo (blur)

```text
┌─────────────────────────────────────────────────────────────┐
│ 👤 João Silva                          [Rep. Legal]         │
│ Sócio-Administrador                                         │
│ ***.***.123-45 | Desde 01/2020                             │
├─────────────────────────────────────────────────────────────┤
│ 📧 joao@empresa.com [✉️] | 📞 (11) 99999-9999              │
│ 💬 (11) 99999-9999                                          │
├─────────────────────────────────────────────────────────────┤
│ 📝 Observações:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Cliente prefere contato pela manhã. Decisor principal  │ │
│ │ para contratos acima de R$ 50k.                        │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [Editar] [Criar Pessoa] [Vincular Existente]               │
└─────────────────────────────────────────────────────────────┘
```

### 3. Funcionamento

**Modo de exibição**:
- Se houver nota, exibe o texto em uma área destacada
- Se não houver nota, exibe um link "Adicionar observação..."

**Modo de edição**:
- Ao clicar no texto ou no link, transforma em textarea
- Auto-save ao clicar fora (onBlur) ou ao pressionar Ctrl+Enter
- Indicador de salvando enquanto processa
- Toast de sucesso/erro após salvar

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `migration` | Adicionar coluna `notes` na tabela `organization_partners` |
| `src/hooks/useOrganizationPartners.ts` | Adicionar `notes` na interface `OrganizationPartner` |
| `src/hooks/useUpdatePartner.ts` | Adicionar `notes` no `UpdatePartnerData` |
| `src/components/organizations/detail/PartnerCard.tsx` | Adicionar seção de observações com edição inline |

## Detalhes Técnicos

### Nova Interface OrganizationPartner

```typescript
export interface OrganizationPartner {
  // ... campos existentes
  notes: string | null;  // NOVO
}
```

### Componente de Notas Inline

```tsx
// Estados
const [isEditingNotes, setIsEditingNotes] = useState(false);
const [localNotes, setLocalNotes] = useState(partner.notes || '');
const textareaRef = useRef<HTMLTextAreaElement>(null);

// Auto-focus ao entrar em edição
useEffect(() => {
  if (isEditingNotes && textareaRef.current) {
    textareaRef.current.focus();
  }
}, [isEditingNotes]);

// Salvar ao sair
const handleBlur = () => {
  if (localNotes !== partner.notes) {
    updateMutation.mutate({
      partnerId: partner.id,
      data: { notes: localNotes.trim() || null }
    });
  }
  setIsEditingNotes(false);
};
```

### Atualização do PartnerEditDialog

O campo de observações também será adicionado ao dialog de edição completa para consistência.

## Resultado Esperado

1. Usuário vê observações existentes no card do sócio
2. Pode clicar para editar rapidamente
3. Salvamento automático ao clicar fora
4. Campo também disponível no dialog de edição completa
5. Dados persistidos no banco de dados

