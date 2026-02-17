
# Adicionar Botao WhatsApp na Coluna Telefone

## O que sera feito
Adicionar um icone/botao clicavel do WhatsApp ao lado do numero de telefone na coluna "Telefone" da tabela de Pessoas, igual ao que ja existe na coluna "WhatsApp".

## Alteracao

### `src/components/people/PeopleTable.tsx`
- Na celula da coluna `phone` (linhas 359-366), adicionar um link para `https://wa.me/{numero}` com o icone do WhatsApp (MessageCircle) ao lado do numero
- O numero sera limpo (apenas digitos) para montar a URL do WhatsApp
- O icone do WhatsApp tera estilo verde (emerald) para diferenciar do icone de telefone

## Secao Tecnica

### Celula atualizada da coluna phone:
```typescript
cell: ({ row }) => {
  const phone = row.original.phone;
  if (!phone) return <span className="text-muted-foreground/50">-</span>;
  const cleanNumber = phone.replace(/\D/g, '');
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Phone className="h-3 w-3" />
      {phone}
      <a
        href={`https://wa.me/${cleanNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-emerald-500 hover:text-emerald-400"
        title="Abrir no WhatsApp"
      >
        <MessageCircle className="h-3.5 w-3.5" />
      </a>
    </span>
  );
},
```

### Arquivo modificado:
- `src/components/people/PeopleTable.tsx` (apenas a celula da coluna phone, ~5 linhas alteradas)
