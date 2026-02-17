

# Adicionar Indices GIN Trigram para Email e Telefone em Organizations

## Objetivo
Criar indices GIN trigram nas colunas `email` e `phone` da tabela `organizations` para que a busca global tambem encontre organizacoes por email e telefone com performance otimizada.

## Contexto
- A tabela `people` ja possui indices GIN trigram para `name`, `email` e `phone`
- A tabela `organizations` agora tem indices para `name` e `cnpj`, mas falta `email` e `phone`
- A busca global (`GlobalSearch.tsx`) ja busca por esses campos via `ILIKE`, mas sem indice a performance e ruim com 19k+ registros

## O que sera feito
Uma migration SQL criando dois novos indices:

```sql
CREATE INDEX IF NOT EXISTS idx_organizations_email_trgm 
  ON public.organizations USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_organizations_phone_trgm 
  ON public.organizations USING gin (phone gin_trgm_ops);
```

## Secao Tecnica

### Impacto
- **Leitura**: Buscas por email e telefone em organizacoes serao significativamente mais rapidas
- **Escrita**: Overhead minimo (padrao de indices GIN)
- **Codigo**: Nenhuma alteracao necessaria -- a busca global ja usa `ILIKE` nesses campos e se beneficiara automaticamente dos indices

### Arquivos
- Uma nova migration SQL (via ferramenta de migration)
- Nenhum arquivo de codigo alterado

