
# Plano: Botão de Ligação Telefônica no Card do Sócio

## Objetivo

Transformar a exibição do telefone no card do sócio em um link clicável que inicia uma chamada telefônica usando o protocolo `tel:`.

## Análise Atual

O telefone atualmente é exibido como texto estático (linhas 132-136):

```tsx
{partner.phone && (
  <span className="flex items-center gap-1">
    <Phone className="h-3 w-3" />
    {partner.phone}
  </span>
)}
```

## Implementação

### Alteração no PartnerCard.tsx

Transformar o `<span>` em um `<a>` com `href="tel:{numero}"`:

| De | Para |
|----|------|
| `<span>` texto estático | `<a href="tel:...">` link clicável |

### Função de Formatação

Criar função `formatPhoneUrl` para limpar o número:

```typescript
function formatPhoneUrl(phone: string): string {
  // Remove caracteres não numéricos exceto +
  return 'tel:' + phone.replace(/[^\d+]/g, '');
}
```

Exemplo:
- Entrada: `(11) 99999-9999`
- Saída: `tel:11999999999`

### Código Atualizado

```tsx
{partner.phone && (
  <a
    href={formatPhoneUrl(partner.phone)}
    className="flex items-center gap-1 text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:underline"
  >
    <Phone className="h-3 w-3" />
    {partner.phone}
  </a>
)}
```

### Visual

```text
📞 CONTATO
┌──────────────────────────────────────────────────────┐
│ 📧 wagner@empresa.com [✉️]                           │
│ 📞 (11) 99999-9999  ← Clicável, abre discador       │
│ 💬 (11) 99999-9999  ← Clicável, abre WhatsApp       │
└──────────────────────────────────────────────────────┘
```

## Cores Utilizadas

| Elemento | Cor |
|----------|-----|
| Telefone | Azul (`text-blue-600`) |
| WhatsApp | Verde (`text-emerald-600`) |
| Email | Cinza (texto) + botão |

## Comportamento Esperado

1. Usuário vê o telefone em azul no card
2. Ao passar o mouse, cursor indica que é clicável
3. Ao clicar:
   - **Desktop**: Abre aplicativo de chamadas (Skype, Teams, etc.) ou pergunta qual usar
   - **Mobile**: Abre discador com número preenchido pronto para ligar

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/organizations/detail/PartnerCard.tsx` | Adicionar função `formatPhoneUrl` e transformar telefone em link |
