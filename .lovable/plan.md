
# Plano: Corrigir Contatos "Contato WhatsApp"

## Diagnóstico

### Problema Principal
O webhook do Timelines.ai está criando contatos duplicados com nome "Contato WhatsApp" devido a:

1. **Formato inconsistente de números de telefone/WhatsApp**
   - Registros existentes: `'+5544999229296`, `+55 43 99101 5557`
   - Webhook salva como: `554497597441`
   - A busca `ilike` não encontra correspondência

2. **Nome não fornecido no payload**
   - O Timelines.ai às vezes envia apenas o número como `full_name`
   - Fallback atual: `'Contato WhatsApp'`

### Dados Encontrados
| ID | Nome | WhatsApp | Origem |
|----|------|----------|--------|
| f8b92... | Contato WhatsApp | 554497597441 | Webhook |
| ec80ae... | Contato WhatsApp | 554898210217 | Webhook |

## Correções Propostas

### 1. Melhorar normalização de telefone no webhook

```typescript
// Antes (só remove não-dígitos)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Depois (garante formato brasileiro consistente)
function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  // Remover código do país se presente (55)
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.substring(2);
  }
  return digits;
}
```

### 2. Melhorar busca de pessoa existente

```typescript
// Buscar por múltiplas variações do número
const phoneVariations = [
  contactPhone,                    // 44999229296
  `55${contactPhone}`,             // 5544999229296
  `+55${contactPhone}`,            // +5544999229296
  `+${contactPhone}`,              // +44999229296
];

const orConditions = phoneVariations.flatMap(p => [
  `whatsapp.ilike.%${p}%`,
  `phone.ilike.%${p}%`,
]).join(',');
```

### 3. Usar número formatado como nome (melhor que "Contato WhatsApp")

```typescript
// Nome fallback mais útil
const contactName = payload.chat.full_name 
  || payload.message?.sender.full_name 
  || formatPhoneForDisplay(payload.chat.phone); // "+55 44 99959-7441"
```

### 4. Normalizar whatsapp ao salvar pessoa

```typescript
// Ao criar nova pessoa, salvar whatsapp no formato padrão
.insert({
  name: contactName,
  whatsapp: formatPhoneStandard(payload.chat.phone), // +5544999597441
  lead_source: 'WhatsApp',
})
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/timelines-webhook/index.ts` | Melhorar normalização e busca |

## Código do Webhook Atualizado

```typescript
// Normaliza número removendo caracteres especiais e padronizando
function normalizePhoneForSearch(phone: string): string {
  // Remove tudo exceto dígitos
  let digits = phone.replace(/\D/g, '');
  
  // Se começar com 55 e tiver mais de 11 dígitos, remove o 55
  if (digits.startsWith('55') && digits.length > 11) {
    return digits.substring(2);
  }
  
  return digits;
}

// Formata telefone para exibição
function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }
  return phone;
}

// Buscar pessoa existente com busca mais robusta
const searchPhone = normalizePhoneForSearch(payload.chat.phone);

// Buscar por variações do número
let { data: existingPerson } = await supabase
  .from('people')
  .select('id, name, whatsapp, phone')
  .or(`whatsapp.ilike.%${searchPhone}%,phone.ilike.%${searchPhone}%`)
  .limit(1)
  .maybeSingle();

// Se não encontrou, tentar com código do país
if (!existingPerson && !searchPhone.startsWith('55')) {
  const { data: foundWithCountry } = await supabase
    .from('people')
    .select('id, name, whatsapp, phone')
    .or(`whatsapp.ilike.%55${searchPhone}%,phone.ilike.%55${searchPhone}%`)
    .limit(1)
    .maybeSingle();
  
  existingPerson = foundWithCountry;
}

// Nome: usar nome real ou número formatado (nunca "Contato WhatsApp" genérico)
const rawName = payload.chat.full_name || payload.message?.sender.full_name;
const isValidName = rawName && !rawName.match(/^\+?\d[\d\s\-]+$/); // Não é apenas número

const contactName = isValidName 
  ? rawName 
  : formatPhoneForDisplay(payload.chat.phone);
```

## Limpeza de Dados Existentes

Também precisamos atualizar os contatos existentes que foram criados incorretamente:

```sql
-- Atualizar contatos "Contato WhatsApp" com o número formatado
UPDATE people 
SET name = '(' || 
  SUBSTRING(whatsapp FROM 3 FOR 2) || ') ' || 
  SUBSTRING(whatsapp FROM 5 FOR 5) || '-' || 
  SUBSTRING(whatsapp FROM 10 FOR 4)
WHERE name = 'Contato WhatsApp' 
  AND whatsapp IS NOT NULL 
  AND LENGTH(whatsapp) >= 11;
```

## Resultado Esperado

1. **Busca mais robusta** - Encontra contatos existentes independente do formato do número
2. **Nomes mais úteis** - Usa número formatado ao invés de "Contato WhatsApp"
3. **Formato consistente** - Todos os novos números salvos no mesmo padrão
4. **Menos duplicatas** - Sistema reconhece o mesmo contato em formatos diferentes

## Fluxo Corrigido

```text
Mensagem WhatsApp chega
         │
         ▼
Normaliza número: "554497597441"
         │
         ▼
Busca pessoa por:
├── whatsapp LIKE %97597441%
├── phone LIKE %97597441%
├── whatsapp LIKE %5597597441%
└── phone LIKE %5597597441%
         │
         ▼
    Encontrou? ──────────────────┐
         │ Não                   │ Sim
         ▼                       ▼
Cria com nome:              Usa pessoa
"(44) 97597-441"            existente
```
