
# Melhorar Deteccao de Empresas Duplicadas na Importacao

## Problema

Ao importar dados do Pipedrive, cada contato vem em uma linha separada com os dados da empresa repetidos. Por exemplo:

```text
| Primeiro nome | Sobrenome | Telefone          | Nome (Empresa)            | CNPJ            |
|---------------|-----------|-------------------|---------------------------|-----------------|
| Antonio       |           | 554330471700      | A C MANOSSO E CIA LTDA ME | 09.407.877/0001-76 |
| Katia         |           | 554330471700...   | A C MANOSSO E CIA LTDA ME | 09.407.877/0001-76 |
```

O sistema precisa:
1. Detectar que "A C MANOSSO" aparece 2 vezes
2. Criar a empresa apenas 1 vez
3. Vincular Antonio e Katia a mesma empresa

## Situacao Atual

O codigo atual **ja possui logica para isso** no `ImportDialog.tsx` (linha 234-333):
- Usa um `orgCache` para evitar duplicatas durante a importacao
- Verifica por CNPJ e nome antes de criar

**Porem**, os aliases de mapeamento automatico nao detectam bem as colunas do Pipedrive.

---

## Solucao

### 1. Adicionar aliases para colunas do Pipedrive

O Pipedrive exporta com colunas como:
- `primeiro nome` / `first name` / `sobrenome` / `last name`
- `Nome` (para empresa) - esse conflita com "nome" da pessoa
- `NUMERO DE INSCRICAO` (para CNPJ)

### 2. Adicionar campo "Sobrenome" e combinar com "Primeiro Nome"

Adicionar campos para capturar primeiro nome e sobrenome separados e combinar na hora da importacao.

### 3. Melhorar deteccao de duplicatas

Na etapa de preview, mostrar quais empresas serao consolidadas (evitando confusao do usuario).

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/lib/import.ts` | Adicionar aliases para Pipedrive e campo `first_name`/`last_name` |
| `src/components/import/ImportDialog.tsx` | Combinar first_name + last_name em name; melhorar mensagens |
| `src/components/import/ImportStepPreview.tsx` | Mostrar aviso de empresas que serao consolidadas |

---

## Detalhes Tecnicos

### 1. src/lib/import.ts - Novos campos e aliases

Adicionar campos para nome separado:

```typescript
export const PERSON_FIELDS: ImportColumn[] = [
  { id: 'name', label: 'Nome da Pessoa', required: true, aliases: ['nome', 'nome completo', 'contato', 'nome do contato', 'full name', 'nome do contato'] },
  { id: 'first_name', label: 'Primeiro Nome', aliases: ['primeiro nome', 'first name', 'firstname', 'primeiro'] },
  { id: 'last_name', label: 'Sobrenome', aliases: ['sobrenome', 'last name', 'lastname', 'ultimo nome'] },
  // ... resto dos campos
];

export const ORGANIZATION_FIELDS: ImportColumn[] = [
  { id: 'org_name', label: 'Nome da Empresa', aliases: [
    'empresa', 'razão social', 'razao social', 'organização', 'organizacao', 'nome da empresa',
    'organization', 'organization name', 'company', 'company name'
  ]},
  { id: 'cnpj', label: 'CNPJ', aliases: [
    'cnpj', 'cnpj da empresa', 'cnpj empresa',
    'número de inscrição', 'numero de inscricao', 'numero inscricao',
    'inscrição', 'inscricao'
  ]},
  // ... resto
];
```

### 2. src/components/import/ImportDialog.tsx - Combinar nomes

Na funcao `performImport`, antes de processar a pessoa:

```typescript
// Combinar first_name + last_name se name nao estiver mapeado
let personName = mappedData.name;
if (!personName && (mappedData.first_name || mappedData.last_name)) {
  personName = [mappedData.first_name, mappedData.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
}

if (!personName) {
  throw new Error('Nome e obrigatorio');
}
```

### 3. src/components/import/ImportStepPreview.tsx - Aviso de consolidacao

Adicionar um aviso informativo quando houver empresas duplicadas que serao consolidadas:

```typescript
// Calcular empresas unicas vs total de linhas com empresa
const orgNamesSet = new Set<string>();
let orgRowsCount = 0;

rows.forEach(row => {
  const orgName = row.mappedData.org_name || row.mappedData.cnpj;
  if (orgName) {
    orgRowsCount++;
    orgNamesSet.add((row.mappedData.cnpj || row.mappedData.org_name || '').toLowerCase().trim());
  }
});

const consolidatedOrgs = orgRowsCount - orgNamesSet.size;

// Exibir aviso se houver consolidacao
{consolidatedOrgs > 0 && (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
    <Info className="h-4 w-4 flex-shrink-0" />
    <span className="text-sm">
      {consolidatedOrgs} linha(s) com empresas repetidas serao vinculadas a mesma empresa
    </span>
  </div>
)}
```

---

## Fluxo de Importacao Atualizado

```text
Arquivo CSV do Pipedrive:
┌─────────────────────────────────────────────────────────────────┐
│ Primeiro nome │ Nome (Empresa)    │ NUMERO INSCRICAO           │
├───────────────┼───────────────────┼────────────────────────────┤
│ Antonio       │ A C MANOSSO       │ 09.407.877/0001-76         │
│ Katia         │ A C MANOSSO       │ 09.407.877/0001-76         │
└─────────────────────────────────────────────────────────────────┘

Mapeamento automatico:
- "Primeiro nome" -> first_name
- "Nome" -> org_name (prioridade para empresa)
- "NUMERO INSCRICAO" -> cnpj

Resultado da importacao:
- 1 Empresa criada: "A C MANOSSO" (CNPJ: 09.407.877/0001-76)
- 2 Pessoas criadas: Antonio e Katia, ambas vinculadas a mesma empresa
```

---

## Validacao na Preview

O sistema mostrara na etapa de preview:

```text
┌────────────────────────────────────────────────────────────────┐
│ ℹ 1 linha(s) com empresas repetidas serao vinculadas          │
│   a mesma empresa automaticamente                              │
├────────────────────────────────────────────────────────────────┤
│ ☑ │ Nome      │ Empresa           │ CNPJ             │ Status │
├───┼───────────┼───────────────────┼──────────────────┼────────┤
│ ✓ │ Antonio   │ A C MANOSSO       │ 09.407.877/0001  │ OK     │
│ ✓ │ Katia     │ A C MANOSSO       │ 09.407.877/0001  │ OK     │
└────────────────────────────────────────────────────────────────┘
```

---

## Resumo das Alteracoes

1. **import.ts**: Adicionar campos `first_name` e `last_name`, e novos aliases para detectar colunas do Pipedrive
2. **ImportDialog.tsx**: Combinar primeiro nome + sobrenome quando nome completo nao estiver mapeado
3. **ImportStepPreview.tsx**: Mostrar aviso informativo sobre empresas que serao consolidadas
4. **Mapeamento automatico**: Priorizar "Nome" para empresa quando houver outras colunas de nome da pessoa

---

## Beneficios

- Compatibilidade total com exportacoes do Pipedrive
- Usuarios verao claramente que empresas serao consolidadas
- Evita duplicacao de empresas no banco de dados
- Varios contatos de uma empresa ficam corretamente vinculados
