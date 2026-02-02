
# Plano: Editar Sócio e Converter para Pessoa

## Objetivo

Permitir que o usuário:
1. **Edite os dados de contato** do sócio (email, telefone, cargo) diretamente no card do sócio
2. **Converta o sócio em pessoa** no CRM, preenchendo automaticamente os dados do sócio

## Análise Atual

A tabela `organization_partners` contém apenas dados oficiais da Receita Federal:
- `name`, `document` (CPF/CNPJ), `qualification`, `entry_date`, `country`
- `legal_rep_name`, `legal_rep_document`, `legal_rep_qualification`

**Faltam campos de contato:** `email`, `phone`, `job_title`

## Solução Proposta

### Fase 1: Alteração no Banco de Dados

Adicionar campos de contato à tabela `organization_partners`:

```sql
ALTER TABLE organization_partners 
  ADD COLUMN email TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN job_title TEXT;
```

### Fase 2: Novo Componente - PartnerEditDialog

Dialog para editar dados de contato do sócio com campos:
- **Email** - com validação de formato
- **Telefone** - com máscara brasileira
- **Cargo** - texto livre (opcional)

### Fase 3: Novo Componente - ConvertPartnerToPersonDialog

Dialog para converter o sócio em uma pessoa do CRM:
- Mostra preview dos dados que serão criados
- Pré-preenche: nome, CPF, email, telefone, cargo, organização
- Define `partner_id` automaticamente para vincular
- Opção de definir como contato principal da organização

### Fase 4: Atualizar PartnerCard

Adicionar botões de ação no card do sócio:
- **Ícone Lápis** - Abre dialog de edição de dados de contato
- **Ícone UserPlus** - Abre dialog de conversão para pessoa (quando não vinculado)
- Manter **Vincular com Pessoa** existente

## Detalhes Técnicos

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/organizations/detail/PartnerEditDialog.tsx` | Dialog para editar email/telefone/cargo do sócio |
| `src/components/organizations/detail/ConvertPartnerToPersonDialog.tsx` | Dialog para criar pessoa a partir do sócio |
| `src/hooks/useUpdatePartner.ts` | Hook para atualizar dados do sócio |
| `src/hooks/useConvertPartnerToPerson.ts` | Hook para criar pessoa a partir do sócio |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOrganizationPartners.ts` | Adicionar campos email, phone, job_title no tipo |
| `src/components/organizations/detail/OrganizationPartners.tsx` | Adicionar botões de ação e lógica dos dialogs |

### Fluxo da Conversão para Pessoa

```text
Sócio sem vínculo
       │
       ├─→ [Editar] → Adiciona email/telefone/cargo
       │
       └─→ [Converter para Pessoa] → Dialog com preview
                    │
                    ▼
              Criar registro em 'people'
                    │
                    ├─ name = partner.name
                    ├─ cpf = partner.document (se CPF)
                    ├─ email = partner.email
                    ├─ phone = partner.phone
                    ├─ job_title = partner.job_title ou partner.qualification
                    ├─ organization_id = partner.organization_id
                    └─ partner_id = partner.id (vincula automaticamente)
```

### Interface do PartnerCard Atualizada

```text
┌──────────────────────────────────────────────────────────┐
│  [Avatar]  WAGNER JOSE LIMA DA SILVA JUNIOR              │
│            Sócio-Administrador                           │
│            ***.***. 123-45  •  Desde 01/2020             │
│                                                          │
│            📧 wagner@empresa.com  📞 (11) 99999-9999     │
│  ──────────────────────────────────────────────────────  │
│  [✏️ Editar]  [👤+ Converter para Pessoa]                │
│                        ou                                │
│  [🔗 Vinculado: Wagner Lima]  [🔓 Desvincular]          │
└──────────────────────────────────────────────────────────┘
```

## Resultado Esperado

1. Usuário clica em **Editar** no card do sócio
2. Dialog abre com campos: Email, Telefone, Cargo
3. Usuário preenche e salva
4. Dados são exibidos no card do sócio
5. Usuário clica em **Converter para Pessoa**
6. Dialog mostra preview dos dados pré-preenchidos
7. Usuário confirma e pessoa é criada vinculada ao sócio
8. Card passa a mostrar "Vinculado: [Nome]" com link para a pessoa
