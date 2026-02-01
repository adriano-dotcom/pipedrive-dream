
# Plano: Vincular Sócio do Quadro Societário com Pessoa Cadastrada

## Objetivo
Permitir que o usuário vincule um sócio do Quadro Societário (importado via RF) com uma pessoa já cadastrada na organização, criando um relacionamento entre os dois registros.

---

## Entendimento do Problema

Atualmente temos:
- **Quadro Societário** (`organization_partners`): Dados oficiais da Receita Federal (nome completo, CPF, qualificação, etc.)
- **Pessoas** (`people`): Contatos cadastrados no CRM, vinculados à organização

O problema: Um sócio "VALDAIR CESAR CAMILO" (RF) pode ser a mesma pessoa que "Valdair" (CRM), mas não há forma de conectar esses registros.

---

## Solução Proposta

Adicionar um botão em cada card de sócio que permite:
1. **Vincular com pessoa existente**: Abre um dialog para selecionar qual pessoa da organização corresponde ao sócio
2. **Ao vincular**: Atualizar os dados da pessoa com informações do sócio (nome completo, CPF se disponível) e criar uma referência

---

## Alterações no Banco de Dados

### Nova coluna na tabela `people`:

```sql
ALTER TABLE people ADD COLUMN partner_id UUID REFERENCES organization_partners(id);
```

Isso cria um vínculo direto entre a pessoa e o registro do sócio, permitindo:
- Saber se uma pessoa está vinculada a um sócio
- Exibir informações do sócio (qualificação, data de entrada) na pessoa
- Identificar sócios já vinculados no Quadro Societário

---

## Alterações de Componentes

### 1. OrganizationPartners.tsx

**Adicionar ao PartnerCard:**
- Botão "Vincular com Pessoa" (ícone de link)
- Badge "Vinculado" se o sócio já tiver uma pessoa associada
- Exibir nome da pessoa vinculada (se houver)

```tsx
// Novo componente interno
function PartnerCard({ partner, people, onLinkPerson }) {
  const linkedPerson = people.find(p => p.partner_id === partner.id);
  
  return (
    <div className="p-4 rounded-lg border ...">
      {/* ... conteúdo existente ... */}
      
      <div className="flex gap-2 mt-2">
        {linkedPerson ? (
          <Badge variant="outline" className="text-xs">
            <User className="h-3 w-3 mr-1" />
            Vinculado: {linkedPerson.name}
          </Badge>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => onLinkPerson(partner)}>
            <Link2 className="h-4 w-4 mr-1" />
            Vincular com Pessoa
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 2. Novo Componente: LinkPartnerToPersonDialog.tsx

Dialog para selecionar a pessoa a vincular:

```tsx
interface LinkPartnerToPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: OrganizationPartner;
  people: OrganizationPerson[];
  organizationId: string;
  onSuccess: () => void;
}

// Funcionalidades:
// - Lista de pessoas da organização
// - Opção de atualizar dados da pessoa com info do sócio
// - Confirmar vinculação
```

### 3. Novo Hook: useLinkPartnerToPerson.ts

```typescript
export function useLinkPartnerToPerson() {
  return useMutation({
    mutationFn: async ({ 
      personId, 
      partnerId, 
      updatePersonData 
    }) => {
      // 1. Atualizar pessoa com partner_id
      // 2. Opcionalmente atualizar nome/cpf com dados do sócio
      // 3. Registrar no histórico
    }
  });
}
```

---

## Fluxo de Uso

```text
┌─────────────────────────────────────────────────────────┐
│  Quadro Societário                         1 sócio      │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │  👤 VALDAIR CESAR CAMILO                          │  │
│  │     Sócio-Administrador                           │  │
│  │     Desde 05/2018                                 │  │
│  │                                                   │  │
│  │     [🔗 Vincular com Pessoa]                      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼  (clique)
┌─────────────────────────────────────────────────────────┐
│  Vincular Sócio com Pessoa                          ✕   │
├─────────────────────────────────────────────────────────┤
│  Sócio: VALDAIR CESAR CAMILO                            │
│                                                         │
│  Selecione a pessoa correspondente:                     │
│                                                         │
│  ◉ Valdair                                              │
│  ○ Outro Contato                                        │
│                                                         │
│  ☑ Atualizar nome para "VALDAIR CESAR CAMILO"          │
│  ☑ Atualizar CPF com dados da RF                       │
│                                                         │
│                    [Cancelar]  [Vincular]               │
└─────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/` | Adicionar coluna `partner_id` na tabela `people` |
| `src/components/organizations/detail/OrganizationPartners.tsx` | Adicionar botão vincular e badge de pessoa vinculada |
| `src/components/organizations/detail/LinkPartnerToPersonDialog.tsx` | **CRIAR** - Dialog de vinculação |
| `src/hooks/useLinkPartnerToPerson.ts` | **CRIAR** - Hook para mutação de vinculação |
| `src/hooks/useOrganizationPartners.ts` | Adicionar query para pessoas vinculadas |

---

## Comportamento Esperado

1. **Sócio sem vínculo**: Exibe botão "Vincular com Pessoa"
2. **Sócio vinculado**: Exibe badge com nome da pessoa e opção de desvincular
3. **Ao vincular**: 
   - Atualiza `people.partner_id` com o ID do sócio
   - Opcionalmente atualiza nome/CPF da pessoa
   - Registra evento no histórico da pessoa
4. **Na listagem de pessoas**: Pode exibir badge indicando que é sócio

---

## Benefícios

- Unifica dados oficiais (RF) com dados do CRM
- Permite saber quem são os sócios entre os contatos
- Mantém dados atualizados automaticamente via enriquecimento
- Evita duplicação de cadastros
