

# Corrigir Importacao - Usar Dados Pre-Carregados na Importacao

## Causa Raiz

O sistema ja busca todos os registros existentes (com paginacao corrigida) para mostrar na tela de preview. Porem, na funcao `performImport`, ele **ignora esses dados** e faz novas consultas individuais ao banco para cada linha:

- Linha 323-330: busca org por `pipedrive_id` (1 query/row)
- Linha 333-340: busca org por `cnpj` (1 query/row)  
- Linha 343-350: busca org por `name` (1 query/row)
- Linha 475-482: busca person por `pipedrive_id` (1 query/row)
- Linha 484-491: busca person por `email` (1 query/row)
- Linha 493-499: busca person por `cpf` (1 query/row)

Total: ate 6 queries apenas para checagem de duplicatas **por linha**. Com 6437 linhas = ~38.000 queries so de checagem. Isso causa timeout/crash do navegador.

## Solucao

Construir indices (Maps) a partir dos dados ja pre-carregados (`existingOrgs`, `existingPeople`) e fazer a checagem em memoria, eliminando ~90% das chamadas ao banco.

### Alteracoes no arquivo `src/components/import/ImportDialog.tsx`

**1. Criar indices em memoria antes do loop (antes da linha 295)**

Adicionar construcao de Maps a partir dos dados pre-carregados:

```text
// Indices para busca rapida em memoria
const orgByPipedriveId = new Map<string, string>();
const orgByCnpj = new Map<string, string>();
const orgByName = new Map<string, string>();

existingOrgs?.forEach(org => {
  if (org.pipedrive_id) orgByPipedriveId.set(org.pipedrive_id, org.id);
  if (org.cnpj) orgByCnpj.set(org.cnpj.replace(/\D/g, ''), org.id);
  if (org.name) orgByName.set(org.name.toLowerCase(), org.id);
});

const personByPipedriveId = new Map<string, string>();
const personByEmail = new Map<string, string>();
const personByCpf = new Map<string, string>();

existingPeople?.forEach(p => {
  if (p.pipedrive_id) personByPipedriveId.set(p.pipedrive_id, p.id);
  if (p.email) personByEmail.set(p.email.toLowerCase(), p.id);
  if (p.cpf) personByCpf.set(p.cpf.replace(/\D/g, ''), p.id);
});
```

**2. Substituir queries individuais de org por busca em memoria (linhas 320-350)**

Trocar as 3 queries sequenciais por:

```text
// Buscar org em memoria primeiro
let existingOrgId = null;
if (mappedData.pipedrive_id) {
  existingOrgId = orgByPipedriveId.get(mappedData.pipedrive_id) || null;
}
if (!existingOrgId && cnpjClean) {
  existingOrgId = orgByCnpj.get(cnpjClean) || null;
}
if (!existingOrgId && orgName) {
  existingOrgId = orgByName.get(orgName.toLowerCase()) || null;
}
```

Manter a query ao banco apenas como fallback caso a org tenha sido criada durante esta mesma importacao e nao esteja no pre-fetch.

**3. Substituir queries individuais de person por busca em memoria (linhas 473-500)**

Mesmo padrao:

```text
let existingPerson = null;
if (personPipedriveId) {
  const id = personByPipedriveId.get(personPipedriveId);
  if (id) existingPerson = { id };
}
if (!existingPerson && emailLower) {
  const id = personByEmail.get(emailLower);
  if (id) existingPerson = { id };
}
if (!existingPerson && cpfClean) {
  const id = personByCpf.get(cpfClean);
  if (id) existingPerson = { id };
}
```

**4. Atualizar indices apos criar novos registros**

Quando um novo registro e criado (org ou person), adicionar ao Map para que linhas subsequentes da mesma importacao tambem encontrem:

```text
// Apos criar nova org
if (newOrg.id) {
  if (cnpjClean) orgByCnpj.set(cnpjClean, newOrg.id);
  if (orgName) orgByName.set(orgName.toLowerCase(), newOrg.id);
  if (mappedData.pipedrive_id) orgByPipedriveId.set(mappedData.pipedrive_id, newOrg.id);
}
```

### Impacto

| Antes | Depois |
|---|---|
| ~6 queries/linha para checagem = ~38.000 queries | 0 queries para checagem (busca em memoria) |
| ~2 queries/linha para insert/update = ~12.000 queries | ~2 queries/linha = ~12.000 queries (sem mudanca) |
| Total: ~50.000 queries | Total: ~12.000 queries |
| Timeout apos ~4.300 linhas | Processamento completo de 6.437 linhas |

### Fluxo apos a correcao

1. Aplicar as alteracoes
2. Reimportar o mesmo arquivo CSV
3. O sistema detectara os 4291 existentes em memoria (sem queries extras)
4. Os ~2146 faltantes serao criados normalmente
5. Tempo estimado reduzido de ~60min para ~15min

