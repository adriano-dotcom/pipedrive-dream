
# Adicionar Coluna WhatsApp na Tabela de Pessoas

## Objetivo

Adicionar uma nova coluna "WhatsApp" na tabela de Pessoas para que seja possível visualizar e selecionar essa informação no menu de visibilidade de colunas.

---

## Situacao Atual

A tabela de Pessoas (`/people`) ja possui o campo `whatsapp` no banco de dados e na exportacao, mas nao exibe como coluna na tabela. Atualmente as colunas disponiveis sao:

- Nome
- Telefone
- Email
- Empresa
- CNPJ
- Cidade
- Automotores
- Cargo
- Status
- Etiquetas

---

## Interface do Usuario

Apos a implementacao, o menu "Colunas" tera a opcao WhatsApp:

```text
┌─────────────────────────────────┐
│ 👁  Visibilidade das Colunas   │
├─────────────────────────────────┤
│ ✓ Nome                          │
│ ✓ Empresa                       │
│ ✓ Telefone                      │
│ ✓ WhatsApp       <-- NOVO       │
│ ✓ Email                         │
│ ✓ CNPJ                          │
│ ...                             │
└─────────────────────────────────┘
```

Na tabela, a coluna sera exibida com o icone do MessageCircle (WhatsApp) e o numero clicavel para abrir o WhatsApp Web.

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/people/PeopleTable.tsx` | Adicionar coluna WhatsApp e atualizar columnLabels |

---

## Detalhes Tecnicos

### PeopleTable.tsx

**1. Adicionar import do icone:**

```typescript
import { MessageCircle } from 'lucide-react';
```

**2. Atualizar columnLabels para incluir WhatsApp:**

```typescript
const columnLabels: Record<string, string> = {
  name: 'Nome',
  phone: 'Telefone',
  whatsapp: 'WhatsApp',  // <-- Adicionar
  email: 'Email',
  organization: 'Empresa',
  cnpj: 'CNPJ',
  city: 'Cidade',
  automotores: 'Automotores',
  job_title: 'Cargo',
  label: 'Status',
  tags: 'Etiquetas',
  actions: 'Acoes',
};
```

**3. Adicionar a definicao da coluna WhatsApp (apos a coluna phone):**

```typescript
{
  id: 'whatsapp',
  accessorKey: 'whatsapp',
  header: ({ column }) => <SortableHeader column={column} title="WhatsApp" />,
  cell: ({ row }) => {
    const whatsapp = row.original.whatsapp;
    if (!whatsapp) return <span className="text-muted-foreground/50">-</span>;
    
    // Limpar o numero para usar no link do WhatsApp
    const cleanNumber = whatsapp.replace(/\D/g, '');
    
    return (
      <a
        href={`https://wa.me/${cleanNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-500 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <MessageCircle className="h-3 w-3" />
        {whatsapp}
      </a>
    );
  },
},
```

---

## Resultado Esperado

| Coluna | Exibicao |
|--------|----------|
| WhatsApp | Numero com icone verde, clicavel para abrir WhatsApp Web |
| Sem numero | Exibe "-" |

A coluna aparecera:
- No menu de visibilidade de colunas
- Pode ser reordenada via drag-and-drop
- Sera persistida nas preferencias do usuario via localStorage
