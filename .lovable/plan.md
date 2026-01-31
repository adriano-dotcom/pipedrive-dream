
# Corrigir Formatacao do CNPJ na Pagina de Detalhes

## Problema

O CNPJ esta sendo exibido sem formatacao na pagina de detalhes de Organizacoes. Na tabela de listagem o formato esta correto (`26.872.410/0001-16`), mas na pagina de detalhes aparece sem mascara (`26872410000116`).

## Locais Afetados

1. **Cabecalho da pagina** (`OrganizationDetails.tsx` linha 237)
   - Exibe: `CNPJ: 26872410000116`
   - Deveria: `CNPJ: 26.872.410/0001-16`

2. **Card de Resumo na Sidebar** (`OrganizationSidebar.tsx` linha 194)
   - Exibe: `26872410000116`
   - Deveria: `26.872.410/0001-16`

## Solucao

Importar e utilizar a funcao `formatCnpj` que ja existe em `src/lib/utils.ts`.

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/OrganizationDetails.tsx` | Importar `formatCnpj` e aplicar na linha 237 |
| `src/components/organizations/detail/OrganizationSidebar.tsx` | Importar `formatCnpj` e aplicar na linha 194 |

## Alteracoes Especificas

### OrganizationDetails.tsx

Adicionar import:
```typescript
import { formatCnpj } from '@/lib/utils';
```

Alterar linha 237:
```typescript
// De:
<p className="text-sm text-muted-foreground">CNPJ: {organization.cnpj}</p>

// Para:
<p className="text-sm text-muted-foreground">CNPJ: {formatCnpj(organization.cnpj)}</p>
```

### OrganizationSidebar.tsx

Adicionar import:
```typescript
import { formatCnpj } from '@/lib/utils';
```

Alterar linha 194:
```typescript
// De:
<span className="font-medium">{organization.cnpj || '—'}</span>

// Para:
<span className="font-medium">{organization.cnpj ? formatCnpj(organization.cnpj) : '—'}</span>
```

## Resultado Esperado

Apos as alteracoes, o CNPJ sera exibido formatado em todos os locais da pagina de detalhes, seguindo o padrao `XX.XXX.XXX/XXXX-XX`.
