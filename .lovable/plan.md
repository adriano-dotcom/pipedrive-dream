

# Tratamento de Multiplos Telefones na Importacao

## Problema

O CSV do Pipedrive pode trazer multiplos telefones na mesma celula, separados por virgula (ex: `5511992323194, 551192323194`). Alguns podem ser repetidos (mesmo numero com formatacao diferente). Precisamos:

1. Separar os telefones
2. Remover duplicatas (comparando apenas digitos)
3. Colocar o primeiro no campo `phone`
4. Se houver um segundo diferente, colocar no campo `whatsapp` (caso o whatsapp ainda nao tenha sido preenchido)

## Mudancas

### Arquivo: `src/components/import/ImportDialog.tsx`

Adicionar uma funcao utilitaria `splitAndDeduplicatePhones` que:
- Recebe a string bruta do campo telefone
- Faz split por virgula
- Limpa cada numero (remove tudo que nao e digito)
- Remove duplicatas comparando os digitos limpos
- Retorna array de numeros unicos

Antes de salvar a pessoa (tanto no create quanto no update), aplicar essa logica:

```text
phones = splitAndDeduplicatePhones(mappedData.phone)
mappedData.phone = phones[0]  (primeiro numero)
if phones[1] e whatsapp nao mapeado:
  mappedData.whatsapp = phones[1]  (segundo numero)
```

A mesma logica sera aplicada ao campo `whatsapp` caso tambem contenha multiplos numeros.

### Arquivo: `src/lib/import.ts` (opcional)

A funcao pode ser adicionada aqui para manter a organizacao, ja que e uma funcao utilitaria de parsing.

## Detalhes Tecnicos

```typescript
function splitAndDeduplicatePhones(raw: string): string[] {
  if (!raw) return [];
  const phones = raw.split(',').map(p => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const phone of phones) {
    const digits = phone.replace(/\D/g, '');
    if (digits && !seen.has(digits)) {
      seen.add(digits);
      unique.push(phone);
    }
  }
  return unique;
}
```

Logica aplicada no ImportDialog antes do insert/update da pessoa:

```text
1. Pegar mappedData.phone e fazer split+dedup
2. Primeiro telefone unico -> phone
3. Segundo telefone unico -> whatsapp (se whatsapp estiver vazio)
4. Fazer o mesmo com mappedData.whatsapp se tiver multiplos valores
```

## Arquivos a editar

- `src/lib/import.ts` - Adicionar funcao `splitAndDeduplicatePhones`
- `src/components/import/ImportDialog.tsx` - Usar a funcao antes de salvar pessoa
