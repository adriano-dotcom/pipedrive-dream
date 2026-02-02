
# Plano: Editar Nome e Dados Completos do Sócio

## Objetivo

Expandir o formulário de edição de sócios para permitir editar **todos os dados**, não apenas os campos de contato. Isso é útil para:
- Corrigir nomes digitados incorretamente
- Atualizar qualificação/cargo oficial
- Adicionar/corrigir documentos
- Modificar dados de representante legal

## Campos Disponíveis para Edição

| Campo | Descrição | Tipo |
|-------|-----------|------|
| `name` | Nome completo do sócio | Texto (obrigatório) |
| `document` | CPF/CNPJ do sócio | Texto com máscara |
| `qualification` | Qualificação oficial (ex: Sócio-Administrador) | Texto |
| `entry_date` | Data de entrada na sociedade | Data |
| `country` | País de origem | Texto |
| `job_title` | Cargo personalizado | Texto |
| `email` | Email de contato | Email |
| `phone` | Telefone de contato | Telefone |
| `whatsapp` | WhatsApp | Telefone |
| `legal_rep_name` | Nome do representante legal | Texto |
| `legal_rep_document` | Documento do representante | Texto |
| `legal_rep_qualification` | Qualificação do representante | Texto |

## Implementação

### Fase 1: Atualizar o Dialog de Edição

Reorganizar o `PartnerEditDialog` em seções:

```text
┌─────────────────────────────────────────────────────────┐
│           Editar Sócio: WAGNER JOSÉ LIMA                │
├─────────────────────────────────────────────────────────┤
│  📋 DADOS PESSOAIS                                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Nome*          [WAGNER JOSÉ LIMA DA SILVA JR     ] ││
│  │ CPF/CNPJ       [***.***. 123-45                   ] ││
│  │ Qualificação   [Sócio-Administrador            ▼] ││
│  │ Data Entrada   [📅 01/2020                       ] ││
│  │ País           [Brasil                         ▼] ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  📞 CONTATO                                             │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Email          [wagner@empresa.com               ] ││
│  │ Telefone       [(11) 99999-9999                  ] ││
│  │ WhatsApp       [(11) 99999-9999                  ] ││
│  │ Cargo          [Diretor Comercial                ] ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  👤 REPRESENTANTE LEGAL (opcional)                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Nome Rep.      [Maria Santos                     ] ││
│  │ Doc. Rep.      [***.***. 456-78                  ] ││
│  │ Qualif. Rep.   [Procurador                       ] ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│               [Cancelar]        [Salvar]                │
└─────────────────────────────────────────────────────────┘
```

### Fase 2: Atualizar Hook de Atualização

Modificar `useUpdatePartner` para aceitar todos os campos editáveis.

### Fase 3: Componentes de Entrada

Utilizar componentes existentes no projeto:
- `Input` para textos simples
- `PhoneInput` para telefones
- `Calendar` para data de entrada
- `Select` para qualificação (com opções predefinidas)

## Detalhes Técnicos

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/organizations/detail/PartnerEditDialog.tsx` | Adicionar todos os campos organizados em seções |
| `src/hooks/useUpdatePartner.ts` | Expandir `UpdatePartnerData` para incluir todos os campos |

### Interface UpdatePartnerData Expandida

```typescript
interface UpdatePartnerData {
  // Dados pessoais
  name?: string;
  document?: string | null;
  qualification?: string | null;
  entry_date?: string | null;
  country?: string | null;
  
  // Contato
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  job_title?: string | null;
  
  // Representante legal
  legal_rep_name?: string | null;
  legal_rep_document?: string | null;
  legal_rep_qualification?: string | null;
}
```

### Qualificações Predefinidas

Lista de qualificações comuns para o select:
- Sócio-Administrador
- Sócio
- Diretor
- Presidente
- Acionista
- Procurador
- Outro

### Validações

- **Nome**: Obrigatório, mínimo 3 caracteres
- **Documento**: Opcional, validar formato CPF/CNPJ se preenchido
- **Data de entrada**: Não pode ser futura
- **Email**: Validar formato se preenchido

## Resultado Esperado

1. Usuário clica em "Editar" no card do sócio
2. Dialog abre com **todas** as informações do sócio organizadas em seções
3. Usuário pode editar qualquer campo
4. Ao salvar, todos os dados são atualizados no banco
5. Card reflete as alterações imediatamente
