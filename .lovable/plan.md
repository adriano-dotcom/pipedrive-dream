

# Corrigir Busca Global para CNPJ/CPF Formatados

## Problema
O usuario digitou `19.593.585/0001-29` (CNPJ formatado) na busca global, mas o banco armazena como `19593585000129` (somente digitos). O `ilike` nao encontra porque os caracteres `.` `/` `-` nao existem no valor armazenado.

O mesmo problema ocorre com CPF (ex: `123.456.789-00` vs `12345678900`) e telefones formatados.

## Solucao

### Modificar `src/components/layout/GlobalSearch.tsx`

Criar uma versao "limpa" (somente digitos) da query para usar nos campos numericos (CNPJ, CPF, telefone), mantendo a query original para campos textuais (nome, email, titulo).

**Logica:**

```text
const query = `%${searchQuery}%`;
const digitsOnly = searchQuery.replace(/\D/g, '');
const cleanQuery = digitsOnly.length >= 3 ? `%${digitsOnly}%` : null;
```

**Queries ajustadas:**

1. **Organizacoes** - Usar `cleanQuery` para CNPJ e telefone quando disponivel:
   - Se `cleanQuery` existir: `.or(name.ilike.${query},cnpj.ilike.${cleanQuery},email.ilike.${query},phone.ilike.${cleanQuery})`
   - Se nao: manter query original

2. **Pessoas** - Usar `cleanQuery` para CPF e telefone:
   - Se `cleanQuery` existir: `.or(name.ilike.${query},email.ilike.${query},phone.ilike.${cleanQuery},cpf.ilike.${cleanQuery})`

3. **Demais entidades** - sem alteracao (nao possuem campos numericos formatados)

**Implementacao simplificada:** Construir o filtro `or` dinamicamente baseado na presenca de `cleanQuery`:

```text
// Para organizacoes
const orgFilter = cleanQuery
  ? `name.ilike.${query},cnpj.ilike.${cleanQuery},email.ilike.${query},phone.ilike.${cleanQuery}`
  : `name.ilike.${query},cnpj.ilike.${query},email.ilike.${query},phone.ilike.${query}`;
```

### Arquivo modificado
- `src/components/layout/GlobalSearch.tsx` (apenas a funcao `queryFn` dentro do `useQuery`)

### Impacto
- Busca por CNPJ formatado (`19.593.585/0001-29`) vai encontrar `19593585000129`
- Busca por CPF formatado (`123.456.789-00`) vai encontrar `12345678900`
- Busca por telefone com espacos/tracos tambem funcionara
- Busca por nome e email continua usando a query original (sem alteracao)

