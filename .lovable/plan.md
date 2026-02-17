

# Adicionar Indices GIN Trigram na Tabela Organizations

## Objetivo
Criar indices GIN com `pg_trgm` nas colunas `name` e `cnpj` da tabela `organizations` para acelerar buscas parciais (`ILIKE`) na busca global, que hoje opera sobre 19k+ registros sem indice.

## O que sera feito
Uma unica migration SQL que cria dois indices GIN trigram usando `CONCURRENTLY` para nao bloquear a tabela durante a criacao:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name_trgm 
  ON public.organizations USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_cnpj_trgm 
  ON public.organizations USING gin (cnpj gin_trgm_ops);
```

## Secao Tecnica

### Por que GIN trigram?
- A extensao `pg_trgm` ja esta habilitada no projeto (confirmado pelas funcoes `similarity`, `show_trgm`, etc.)
- Indices GIN com `gin_trgm_ops` aceleram consultas `ILIKE '%termo%'` que sao usadas na busca global (`GlobalSearch.tsx`)
- A tabela `people` ja possui indices similares (`idx_people_name_trgm`, `idx_people_email_trgm`, `idx_people_phone_trgm`), entao estamos alinhando o padrao

### Impacto
- **Leitura**: Buscas por nome e CNPJ em organizacoes serao significativamente mais rapidas
- **Escrita**: Pequeno overhead ao inserir/atualizar registros (custo normal de manter indices GIN)
- **Nenhuma alteracao de codigo**: A busca global ja usa `ILIKE` que se beneficia automaticamente dos indices

### Arquivos
- Uma nova migration SQL (criada via ferramenta de migration)
- Nenhum arquivo de codigo alterado

