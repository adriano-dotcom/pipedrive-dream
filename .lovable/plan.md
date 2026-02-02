
# Plano: Botão para Abrir WhatsApp

## Objetivo

Transformar a exibição do WhatsApp no card do sócio em um botão clicável que abre diretamente uma conversa no WhatsApp Web/App.

## Implementação

### Alterações no PartnerCard.tsx

Modificar a exibição do WhatsApp (linha 113-118) de um texto estático para um botão clicável que:

1. Formata o número para o padrão internacional do WhatsApp (55 + DDD + número)
2. Abre `https://wa.me/{numero}` em uma nova aba

### Função de Formatação do Número

Criar uma função `formatWhatsAppLink` que:
- Remove caracteres não numéricos
- Adiciona código do Brasil (55) se não estiver presente
- Retorna a URL completa para o WhatsApp

```text
Número: (11) 99999-9999
         ↓
Limpo: 11999999999
         ↓
URL: https://wa.me/5511999999999
```

### Interface Atualizada

```text
📞 CONTATO
┌──────────────────────────────────────────────────────┐
│ 📧 wagner@empresa.com                                │
│ 📞 (11) 99999-9999                                   │
│ 💬 (11) 99999-9999  [Abrir WhatsApp →]              │
└──────────────────────────────────────────────────────┘
```

O número será exibido como um link/botão verde (cor do WhatsApp) que ao clicar:
- Abre nova aba com `wa.me`
- No celular, abre o app do WhatsApp diretamente

## Detalhes Técnicos

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/organizations/detail/PartnerCard.tsx` | Adicionar função de formatação e transformar exibição do WhatsApp em link clicável |

### Código da Função

```typescript
function formatWhatsAppUrl(phone: string): string {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Adiciona código do Brasil se não tiver
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  return `https://wa.me/${cleaned}`;
}
```

### Exibição Atualizada

```tsx
{partner.whatsapp && (
  <a
    href={formatWhatsAppUrl(partner.whatsapp)}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline"
  >
    <MessageCircle className="h-3 w-3" />
    {partner.whatsapp}
  </a>
)}
```

## Resultado Esperado

1. Usuário vê o número do WhatsApp no card do sócio em verde
2. Ao passar o mouse, o cursor indica que é clicável
3. Ao clicar, abre o WhatsApp Web em nova aba com a conversa pronta para iniciar
4. Em dispositivos móveis, abre o app do WhatsApp diretamente
