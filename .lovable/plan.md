

# Corrigir Exibição de Telefone no Formulário de Edição

## Problema Identificado

O campo telefone no banco de dados contém um valor em formato não-padrão (importado do Pipedrive):

| Campo | Valor no Banco |
|-------|----------------|
| phone | `5543991407114, (43) 9140-7114` |
| whatsapp | `null` |

Quando esse valor passa pelo componente `PhoneInput` que usa máscara fixa `(##) #####-####`:
- A máscara espera exatamente 11 dígitos
- O valor real tem 28+ caracteres (dois telefones separados por vírgula)
- Resultado: apenas os primeiros 11 dígitos são exibidos → `(55) 43991-4071`
- Os dados restantes são perdidos na edição

**Na sidebar (visualização)**: Exibe o valor bruto do banco → `5543991407114, (43) 9140-7114`
**No formulário (edição)**: A máscara corta para → `(55) 43991-4071`

---

## Solução Proposta

Modificar o `PhoneInput` para detectar quando o valor não se encaixa no padrão brasileiro e, nesses casos, usar um input de texto simples em vez da máscara.

### Lógica de Detecção

```text
Se o valor:
  - Contém vírgula ou ponto-e-vírgula (múltiplos telefones)
  - Tem mais de 11 dígitos após limpar
  - Começa com código de país diferente de 55

→ Usar Input simples (sem máscara)
→ Caso contrário, usar PhoneInput com máscara normal
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/ui/phone-input.tsx` | Detectar valores não-padrão e usar Input simples |

---

## Detalhes Técnicos

### phone-input.tsx - Nova Implementação

```typescript
import { PatternFormat, PatternFormatProps } from 'react-number-format';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<PatternFormatProps, 'format' | 'mask' | 'customInput' | 'onValueChange'> {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  onBlur?: () => void;
}

// Verifica se o valor pode ser formatado com a máscara brasileira
function canUseBrazilianMask(value: string | null | undefined): boolean {
  if (!value) return true; // Valores vazios podem usar máscara
  
  // Se contém separadores (múltiplos telefones), não usar máscara
  if (value.includes(',') || value.includes(';')) return false;
  
  // Extrair apenas dígitos
  const digits = value.replace(/\D/g, '');
  
  // Telefone brasileiro tem 10-11 dígitos (com DDD) ou 12-13 (com código país)
  // Se tem mais que isso, provavelmente é formato especial
  if (digits.length > 13) return false;
  
  return true;
}

export function PhoneInput({ value, onValueChange, className, onBlur, ...props }: PhoneInputProps) {
  // Se o valor não pode usar máscara brasileira, usar input simples
  if (!canUseBrazilianMask(value)) {
    return (
      <Input
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Telefone"
        className={cn(className)}
        {...props}
      />
    );
  }

  return (
    <PatternFormat
      format="(##) #####-####"
      mask="_"
      customInput={Input}
      value={value}
      onValueChange={(values) => onValueChange(values.value)}
      onBlur={onBlur}
      placeholder="(00) 00000-0000"
      className={cn(className)}
      {...props}
    />
  );
}
```

---

## Comportamento Esperado

### Caso 1: Telefone Padrão Brasileiro
- Entrada: `43991407114`
- Exibição: `(43) 99140-7114` (com máscara)
- Ao digitar: Máscara aplicada automaticamente

### Caso 2: Múltiplos Telefones (Pipedrive)
- Entrada: `5543991407114, (43) 9140-7114`
- Exibição: `5543991407114, (43) 9140-7114` (sem máscara, valor completo)
- Ao digitar: Input livre sem formatação

### Caso 3: Telefone Internacional
- Entrada: `+1 555 123 4567`
- Exibição: `+1 555 123 4567` (sem máscara)
- Ao digitar: Input livre

---

## Benefícios

1. **Preserva dados**: Valores importados não são mais corrompidos ao editar
2. **Retrocompatível**: Telefones no formato brasileiro continuam com máscara
3. **Flexível**: Suporta formatos internacionais e múltiplos telefones
4. **Sem perda de dados**: O usuário vê exatamente o que está no banco

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────┐
│ Formulário de Edição                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Telefone                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 5543991407114, (43) 9140-7114                           │ │  ← Valor completo
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ WhatsApp                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ (00) 00000-0000                                         │ │  ← Com máscara (vazio)
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

