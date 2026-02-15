

# Padronizar Nomes com Primeira Letra Maiuscula na Importacao

## Problema

Os nomes importados do CSV vem em formatos inconsistentes (tudo maiusculo, tudo minusculo, misturado). Exemplo: "WALTER CARVALHO MARZOLA FARIA" deveria virar "Walter Carvalho Marzola Faria".

## Solucao

Adicionar uma funcao `toTitleCase` em `src/lib/import.ts` e aplica-la aos campos de nome (`name`, `first_name`, `last_name`) durante o processamento da importacao em `src/components/import/ImportDialog.tsx`.

## Detalhes Tecnicos

### Arquivo: `src/lib/import.ts`

Adicionar funcao utilitaria:

```text
function toTitleCase(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

Particulas como "da", "de", "do", "dos", "das" serao mantidas em minusculo para nomes brasileiros (ex: "Walter da Silva").

### Arquivo: `src/components/import/ImportDialog.tsx`

Antes de salvar a pessoa, aplicar `toTitleCase` nos campos de nome:

```text
mappedData.name = toTitleCase(mappedData.name)
mappedData.first_name = toTitleCase(mappedData.first_name)
mappedData.last_name = toTitleCase(mappedData.last_name)
```

### Tambem aplicar ao nome da organizacao (`org_name`) para manter consistencia.

