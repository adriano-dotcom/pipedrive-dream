

# Atualizar Importacao para CSV do Pipedrive

## Resumo

Ajustar o sistema de importacao para reconhecer automaticamente todos os cabecalhos do formato de exportacao do Pipedrive e adicionar funcionalidades que faltam.

## Mudancas Necessarias

### 1. Novos aliases nos campos existentes (src/lib/import.ts)

Adicionar aliases para que o auto-detect funcione com os cabecalhos do Pipedrive:

**Pessoa:**
- `name`: adicionar `"pessoa - nome"`
- `email`: adicionar `"pessoa - e-mail - trabalho"`, `"pessoa - e-mail - outros"`, `"pessoa - e-mail"`
- `phone`: adicionar `"pessoa - telefone - trabalho"`, `"pessoa - telefone - outros"`, `"pessoa - telefone - residencial"`, `"pessoa - telefone"`
- `whatsapp`: adicionar `"pessoa - telefone - celular"`
- `label`: adicionar `"pessoa - etiquetas"`, `"pessoa - label"`

**Empresa:**
- `pipedrive_id`: adicionar `"organização - id"`, `"organizacao - id"`
- `org_name`: adicionar `"organização - nome"`, `"organizacao - nome"`
- `automotores`: adicionar `"organização - automotores"`, `"organizacao - automotores"`
- `address`: adicionar `"organização - endereço"`, `"organizacao - endereco"` (novo campo)

### 2. Novo campo: person_pipedrive_id (pessoa)

Adicionar campo `person_pipedrive_id` no PERSON_FIELDS para mapear `Pessoa - ID`:
- aliases: `"pessoa - id"`, `"person id"`, `"id da pessoa"`

### 3. Novo campo: org_address (endereco completo)

Adicionar campo `org_address` no ORGANIZATION_FIELDS para capturar o endereco no formato "Cidade,Estado,Pais" e fazer o parsing automatico para `address_city` e `address_state`.

### 4. Logica de parsing de endereco (ImportDialog.tsx)

No `performImport`, ao encontrar o campo `org_address`, fazer split por virgula e preencher:
- Primeiro item -> `address_city`
- Segundo item -> `address_state`
- Ignorar terceiro (pais)

### 5. Suporte a tags na importacao (Pessoa e Organizacao)

Adicionar campo `person_tags` e `org_tags` no mapeamento. No `performImport`:
- Fazer split das tags por virgula
- Para cada tag, verificar se ja existe na tabela `person_tags` / `organization_tags`
- Criar se nao existir
- Criar o `person_tag_assignments` / `organization_tag_assignments`

### 6. Migracao: campo pipedrive_id na tabela people

Adicionar coluna `pipedrive_id` (text, nullable) na tabela `people` para armazenar o ID da pessoa no Pipedrive, utilizado para deduplicacao.

## Detalhes Tecnicos

### Arquivos a editar:
- `src/lib/import.ts` - Novos aliases e novos campos
- `src/components/import/ImportDialog.tsx` - Logica de parsing de endereco, tags e person pipedrive_id
- `src/components/import/ImportStepMapping.tsx` - Nenhuma mudanca (usa campos de import.ts)
- `src/components/people/PersonForm.tsx` - Exibir pipedrive_id (leitura)
- Nova migracao SQL para `people.pipedrive_id`

### Migracao SQL:
```sql
ALTER TABLE public.people ADD COLUMN pipedrive_id text;
```

### Fluxo de deduplicacao de pessoa atualizado:
```text
1. Verificar por pipedrive_id (pessoa)
2. Verificar por email
3. Verificar por CPF
4. Se nao encontrou -> criar nova pessoa
```

### Parsing de endereco:
```text
"Foz Do Iguacu,Parana,Brasil"
  -> address_city = "Foz Do Iguacu"
  -> address_state = "Parana"
```

### Parsing de tags:
```text
"EMAIL PENDENTE, Prospeccao Lovable IA"
  -> ["EMAIL PENDENTE", "Prospeccao Lovable IA"]
  -> Para cada: find_or_create na tabela de tags
  -> Criar assignment
```

## Ordem de implementacao

1. Migracao SQL (people.pipedrive_id)
2. Atualizar aliases e campos em import.ts
3. Atualizar logica de importacao no ImportDialog.tsx (endereco, tags, person pipedrive_id)
4. Exibir pipedrive_id no formulario de pessoa

