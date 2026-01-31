
# Funcionalidade de Mesclar Organizacoes Duplicadas

## Objetivo

Implementar uma funcionalidade para mesclar organizacoes duplicadas, seguindo exatamente o mesmo padrao ja implementado para pessoas (contatos), permitindo combinar todos os dados e relacionamentos de duas organizacoes em uma unica.

---

## Cenario de Uso

1. Usuario identifica duas organizacoes que sao a mesma empresa (ex: "Transportadora XYZ" e "XYZ Transportes")
2. Um registro tem CNPJ e endereco, outro tem contato principal e ramos de seguro
3. Usuario seleciona as duas organizacoes e escolhe "Mesclar"
4. Sistema combina os dados em um unico registro, mantendo o mais completo de cada campo

---

## Arquitetura Existente (Referencia)

O sistema ja possui implementacao completa para mesclar pessoas:

| Arquivo | Funcao |
|---------|--------|
| `useMergeContacts.ts` | Hook com logica de mesclagem |
| `MergeContactsDialog.tsx` | Dialog para selecionar valores |
| `ContactSearchDialog.tsx` | Busca de contato para mesclar |
| `People.tsx` | Integracao na lista |
| `PeopleTable.tsx` | Botao "Mesclar" na toolbar |
| `PersonDetails.tsx` | Opcao no menu da pagina de detalhes |

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useMergeOrganizations.ts` | Hook com logica de mesclagem de organizacoes |
| `src/components/organizations/MergeOrganizationsDialog.tsx` | Dialog para selecionar valores de cada campo |
| `src/components/organizations/OrganizationSearchDialog.tsx` | Busca de organizacao para mesclar |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/Organizations.tsx` | Adicionar estado e dialog de mesclagem |
| `src/components/organizations/OrganizationsTable.tsx` | Adicionar botao "Mesclar" na toolbar |
| `src/pages/OrganizationDetails.tsx` | Adicionar opcao "Mesclar" no menu de acoes |

---

## Campos a Mesclar (Campo a Campo)

| Campo | Tipo | Observacao |
|-------|------|------------|
| name | texto | Usuario escolhe |
| cnpj | texto | Usuario escolhe |
| cnae | texto | Usuario escolhe |
| rntrc_antt | texto | Usuario escolhe |
| phone | texto | Usuario escolhe |
| email | texto | Usuario escolhe |
| website | texto | Usuario escolhe |
| address_* | texto | Usuario escolhe (endereco completo) |
| label | texto | Usuario escolhe (Quente/Morno/Frio) |
| primary_contact_id | uuid | Usuario escolhe |
| insurance_branches | array | Combinar ambos |
| preferred_insurers | array | Combinar ambos |
| fleet_type | texto | Usuario escolhe |
| fleet_size | numero | Usuario escolhe |
| current_insurer | texto | Usuario escolhe |
| risk_profile | texto | Usuario escolhe |
| policy_renewal_month | numero | Usuario escolhe |
| annual_premium_estimate | numero | Usuario escolhe |
| has_claims_history | boolean | Usuario escolhe |
| automotores | numero | Usuario escolhe |
| notes | texto | Concatenar ambos |
| broker_notes | texto | Concatenar ambos |

---

## Relacionamentos a Transferir

| Tabela | Campo | Acao |
|--------|-------|------|
| `activities` | organization_id | Atualizar para org mantida |
| `deals` | organization_id | Atualizar para org mantida |
| `people` | organization_id | Atualizar para org mantida |
| `organization_notes` | organization_id | Transferir todas |
| `organization_files` | organization_id | Transferir todos |
| `organization_history` | organization_id | Transferir + registrar evento |
| `organization_tag_assignments` | organization_id | Combinar tags (sem duplicar) |
| `sent_emails` (entity_type='organization') | entity_id | Atualizar |

---

## Detalhes Tecnicos

### 1. useMergeOrganizations.ts

```typescript
interface MergeOrganizationsParams {
  keepOrgId: string;
  deleteOrgId: string;
  deleteOrgName: string;
  mergedData: Partial<Organization>;
}

// Passos da mesclagem:
// 1. Atualizar registro mantido com dados mesclados
// 2. Transferir atividades
// 3. Transferir negocios
// 4. Transferir pessoas vinculadas
// 5. Transferir notas
// 6. Transferir arquivos
// 7. Transferir historico
// 8. Combinar tags
// 9. Transferir emails enviados
// 10. Registrar evento no historico
// 11. Excluir organizacao duplicada
```

### 2. MergeOrganizationsDialog.tsx

Interface similar ao MergeContactsDialog:
- Grid de 3 colunas: Campo | Org 1 | Org 2
- Radio buttons para selecionar valor de cada campo
- Pre-selecao automatica de valores nao vazios
- Alerta sobre irreversibilidade
- Arrays (insurance_branches, preferred_insurers) sao combinados automaticamente

### 3. OrganizationSearchDialog.tsx

Dialog para buscar segunda organizacao quando iniciado da pagina de detalhes:
- Campo de busca por nome, CNPJ ou email
- Lista de resultados com cidade/estado
- Exclui a organizacao atual da busca

### 4. Integracao na Organizations.tsx

```typescript
// Estado
const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

// Condicao para mostrar dialog
{selectedIds.length === 2 && (
  <MergeOrganizationsDialog
    open={mergeDialogOpen}
    onOpenChange={setMergeDialogOpen}
    org1={filteredOrganizations.find(o => o.id === selectedIds[0])!}
    org2={filteredOrganizations.find(o => o.id === selectedIds[1])!}
    onSuccess={() => {
      setSelectedIds([]);
      setMergeDialogOpen(false);
    }}
  />
)}
```

### 5. Botao na OrganizationsTable

Na toolbar, quando 2 organizacoes estao selecionadas:
```typescript
{selectedIds.length === 2 && (
  <Button variant="outline" size="sm" onClick={onMerge}>
    <GitMerge className="h-4 w-4 mr-1.5" />
    Mesclar
  </Button>
)}
```

### 6. Menu em OrganizationDetails

```typescript
<DropdownMenuItem onClick={() => setSearchDialogOpen(true)}>
  <GitMerge className="h-4 w-4 mr-2" />
  Mesclar com outra organizacao...
</DropdownMenuItem>
```

---

## Fluxo de Mesclagem

```text
1. Usuario seleciona 2 organizacoes na lista OU
   Usuario clica "Mesclar" na pagina de detalhes
              │
              ▼
2. Dialog abre mostrando campos lado a lado
   - Usuario escolhe qual valor manter para cada campo
   - Arrays sao combinados automaticamente
              │
              ▼
3. Usuario confirma a mesclagem
              │
              ▼
4. Sistema executa:
   a) Atualiza registro mantido com dados escolhidos
   b) Transfere atividades, negocios, pessoas, notas, arquivos
   c) Combina tags sem duplicar
   d) Registra evento no historico
   e) Exclui organizacao duplicada
              │
              ▼
5. Redireciona para pagina da organizacao mesclada
   - Toast de sucesso
   - Queries invalidadas
```

---

## Campos Especificos de Organizacoes

Alem dos campos basicos, as organizacoes tem campos especificos de seguros:

| Grupo | Campos |
|-------|--------|
| Dados Basicos | name, cnpj, cnae, rntrc_antt |
| Contato | phone, email, website |
| Endereco | address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zipcode |
| Seguro | insurance_branches, preferred_insurers, fleet_type, fleet_size, current_insurer, risk_profile |
| Renovacao | policy_renewal_month, annual_premium_estimate, has_claims_history |
| Outros | label, notes, broker_notes, automotores |

---

## Logica Especial para Arrays

```typescript
// Combinar insurance_branches
const mergedBranches = [
  ...new Set([
    ...(org1.insurance_branches || []),
    ...(org2.insurance_branches || [])
  ])
];

// Combinar preferred_insurers
const mergedInsurers = [
  ...new Set([
    ...(org1.preferred_insurers || []),
    ...(org2.preferred_insurers || [])
  ])
];
```

---

## Validacoes

1. Apenas usuarios autenticados podem mesclar
2. Dialog de confirmacao antes de executar
3. Acao irreversivel - avisar usuario claramente
4. Historico registrado para auditoria
5. Pessoas vinculadas sao atualizadas automaticamente
6. Se ambas organizacoes tem contato principal, usuario escolhe qual manter

---

## Resumo de Implementacao

1. **Criar useMergeOrganizations.ts**: Hook com logica de mesclagem
2. **Criar MergeOrganizationsDialog.tsx**: Interface de selecao de campos
3. **Criar OrganizationSearchDialog.tsx**: Busca de organizacao
4. **Modificar Organizations.tsx**: Adicionar estado e dialog
5. **Modificar OrganizationsTable.tsx**: Botao "Mesclar" na toolbar
6. **Modificar OrganizationDetails.tsx**: Opcao no menu de acoes

---

## Beneficios

- Elimina organizacoes duplicadas mantendo todos os dados
- Consolida pessoas vinculadas, negocios, atividades e historico
- Interface intuitiva identica a mesclagem de contatos
- Campos de seguro sao combinados automaticamente
- Auditoria completa via historico
