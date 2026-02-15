

# Adicionar ID Externo (Pipedrive) nas Organizações

## Resumo

Adicionar um campo `pipedrive_id` na tabela `organizations` para armazenar o ID original do Pipedrive. Isso permite identificar empresas importadas e evitar duplicatas em importações futuras.

---

## O Que Será Feito

### 1. Migração do Banco de Dados
- Adicionar coluna `pipedrive_id` (text, nullable, unique) na tabela `organizations`

### 2. Atualizar o Sistema de Importação
- Adicionar campo `pipedrive_id` nos campos de mapeamento (`ORGANIZATION_FIELDS` em `src/lib/import.ts`)
- Aliases: "id", "id da empresa", "organization id", "pipedrive id", "id pipedrive", "id (empresa)"
- Na lógica de importação (`ImportDialog.tsx`), usar o `pipedrive_id` como critério adicional para detectar duplicatas (antes de CNPJ e nome)

### 3. Exibir na Interface (Opcional/Leitura)
- O campo será visível no formulário de organização como campo de leitura, apenas para referência

---

## Fluxo de Importação Atualizado

```text
Para cada linha do CSV:
  1. Tem pipedrive_id? -> Busca organização por pipedrive_id
  2. Tem CNPJ?        -> Busca organização por CNPJ
  3. Tem nome?        -> Busca organização por nome (ilike)
  4. Nenhum match     -> Cria nova organização
```

---

## Detalhes Técnicos

### Migração SQL

```sql
ALTER TABLE organizations 
  ADD COLUMN pipedrive_id text UNIQUE;
```

### Mudanças em `src/lib/import.ts`

Adicionar ao array `ORGANIZATION_FIELDS`:

```typescript
{ 
  id: 'pipedrive_id', 
  label: 'ID Pipedrive', 
  aliases: [
    'id', 'id da empresa', 'organization id', 'pipedrive id', 
    'id pipedrive', 'id (empresa)', 'org id', 'id organização'
  ] 
},
```

### Mudanças em `ImportDialog.tsx`

Na função `performImport`, adicionar verificação por `pipedrive_id` antes de CNPJ/nome:

```typescript
// Check by pipedrive_id first
if (mappedData.pipedrive_id) {
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('pipedrive_id', mappedData.pipedrive_id)
    .maybeSingle();
  existingOrg = data;
}
```

E ao criar/atualizar organização, incluir o campo `pipedrive_id`.

### Mudanças em `OrganizationForm.tsx`

Exibir o campo `pipedrive_id` como leitura (se preenchido) no formulário de edição.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Adicionar coluna `pipedrive_id` |
| `src/lib/import.ts` | Adicionar campo no mapeamento |
| `src/components/import/ImportDialog.tsx` | Usar `pipedrive_id` na detecção de duplicatas |
| `src/components/organizations/OrganizationForm.tsx` | Exibir campo de leitura |

