

# Melhorar Fluxo de Criacao de Campanhas de E-mail

## Problema Atual
O fluxo atual exige que o usuario selecione manualmente cada contato via checkbox na tabela antes de poder enviar um e-mail em massa. Isso e impratico quando se quer enviar para todos os contatos filtrados (ex: todos de uma cidade, todos com uma etiqueta especifica). Alem disso, o botao "E-mail em Massa" so aparece para administradores.

## Solucao Proposta
Criar um fluxo mais pratico com duas opcoes de envio:

1. **Enviar para selecionados** (fluxo atual, mantido)
2. **Enviar para todos os filtrados** (NOVO) - envia para todos os contatos que atendem aos filtros ativos, sem precisar selecionar um a um

## Alteracoes

### 1. `src/pages/People.tsx`
- Adicionar um novo estado `bulkEmailMode` para distinguir entre "selected" e "filtered"
- Criar uma funcao `fetchAllFilteredPeople` que busca TODOS os contatos filtrados (sem paginacao) para montar a lista de destinatarios
- Ao abrir o composer no modo "filtered", carregar todos os contatos que atendem aos filtros atuais
- Mover o botao "Campanhas" para a barra de acoes em lote tambem

### 2. `src/components/people/PeopleTable.tsx`
- Tornar o botao "E-mail em Massa" visivel para TODOS os usuarios (nao apenas admins), ja que enviar email nao e uma acao destrutiva
- Adicionar um novo botao "Enviar para todos os filtrados" na toolbar, visivel quando ha filtros ativos (independente de selecao)
- Adicionar callback `onBulkEmailAll` para o modo "todos filtrados"

### 3. `src/components/email/BulkEmailComposerDialog.tsx`
- Aceitar um novo prop opcional `isLoadingRecipients` para mostrar loading enquanto busca os destinatarios filtrados
- Mostrar um resumo mais claro: "X de Y contatos tem e-mail valido"

## Fluxo do Usuario (dia a dia)

```text
1. Usuario aplica filtros (cidade, etiqueta, cargo, etc.)
2. Clica em "Enviar para X filtrados" na toolbar
3. Sistema busca todos os contatos filtrados (nao so a pagina atual)
4. Abre o compositor com a lista completa de destinatarios
5. Usuario escolhe template, personaliza e envia
```

OU o fluxo manual existente:

```text
1. Usuario seleciona contatos via checkbox
2. Clica em "E-mail em Massa"
3. Abre o compositor com os selecionados
```

## Secao Tecnica

### Nova funcao em People.tsx para buscar todos os filtrados:
```typescript
const fetchAllFilteredRecipients = async () => {
  // Reutiliza a mesma logica de filtros do fetchPeople
  // mas sem paginacao (range) e selecionando apenas campos necessarios
  let query = supabase
    .from('people')
    .select('id, name, email, email_status, job_title, organization_id, organizations:organizations!people_organization_id_fkey(name, address_city)')
    .order('name');
  
  // Aplica os mesmos filtros server-side...
  // (search, labels, cities, tags, etc.)
  
  const { data } = await query;
  return data;
};
```

### Novo prop em PeopleTable:
```typescript
interface PeopleTableProps {
  // ...existentes
  onBulkEmailAll?: () => void;  // NOVO
  hasActiveFilters?: boolean;    // NOVO
  totalCount?: number;           // ja existe
}
```

### Novo botao na toolbar (visivel com filtros ativos):
```typescript
{hasActiveFilters && totalCount > 0 && (
  <Button variant="outline" size="sm" onClick={onBulkEmailAll} className="h-8">
    <Send className="h-4 w-4 mr-1.5" />
    Enviar para {totalCount} filtrados
  </Button>
)}
```

### Arquivos modificados:
- `src/pages/People.tsx` - logica de busca de todos filtrados + novo modo
- `src/components/people/PeopleTable.tsx` - botao "enviar para filtrados" + visibilidade do botao de email
- `src/components/email/BulkEmailComposerDialog.tsx` - suporte a loading de destinatarios

Nenhuma migracao SQL necessaria.

