
# Funcionalidade de Mesclar Contatos (Pessoas)

## Objetivo

Implementar uma funcionalidade similar ao Pipedrive para mesclar duas pessoas (contatos) duplicadas em um unico registro, combinando todos os dados e relacionamentos.

---

## Cenario de Uso

1. Usuario identifica dois contatos que sao a mesma pessoa (ex: "Wilson" e "Wilson teste")
2. Um registro tem email, outro tem telefone - ambos incompletos
3. Usuario seleciona os dois contatos e escolhe "Mesclar"
4. Sistema combina os dados em um unico registro, mantendo o mais completo de cada campo

---

## Interface do Usuario

### 1. Acesso a Funcionalidade

A mesclagem pode ser iniciada de duas formas:

**Opcao A - Na lista de contatos:**
- Selecionar exatamente 2 contatos com checkbox
- Botao "Mesclar" aparece na barra de acoes

**Opcao B - Na pagina de detalhes:**
- Menu "..." no header com opcao "Mesclar com outro contato..."
- Abre busca para selecionar segundo contato

### 2. Dialog de Mesclagem

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 🔀 Mesclar Contatos                                            [X]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Selecione qual valor manter para cada campo:                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Campo         │ Wilson (manter)      │ Wilson teste            │ │
│  ├───────────────┼──────────────────────┼─────────────────────────┤ │
│  │ Nome          │ ● Wilson             │ ○ Wilson teste          │ │
│  │ Email         │ ● wilson@gmail.com   │ ○ -                     │ │
│  │ Telefone      │ ○ -                  │ ● (43) 99999-9999       │ │
│  │ WhatsApp      │ ○ -                  │ ● (43) 99999-9999       │ │
│  │ Cargo         │ ● Gerente            │ ○ -                     │ │
│  │ Organizacao   │ ● Empresa ABC        │ ○ -                     │ │
│  │ Status        │ ○ Quente             │ ● Morno                 │ │
│  │ CPF           │ ○ -                  │ ○ -                     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ℹ️ Notas, arquivos, atividades e negocios serao combinados.         │
│  ⚠️ O contato "Wilson teste" sera excluido apos a mesclagem.        │
│                                                                      │
│  [Cancelar]                              [Mesclar Contatos]          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Dados a Serem Mesclados

### Campos da Pessoa (escolha campo a campo)

| Campo | Logica |
|-------|--------|
| name | Usuario escolhe |
| email | Usuario escolhe |
| phone | Usuario escolhe |
| whatsapp | Usuario escolhe |
| cpf | Usuario escolhe |
| job_title | Usuario escolhe |
| organization_id | Usuario escolhe |
| label | Usuario escolhe |
| lead_source | Usuario escolhe |
| utm_source, utm_medium, utm_campaign | Usuario escolhe |
| notes | Combinar (concatenar) |

### Relacionamentos (transferir automaticamente)

| Tabela | Acao |
|--------|------|
| activities | Atualizar person_id para o registro mantido |
| deals | Atualizar person_id para o registro mantido |
| people_notes | Transferir todas para o registro mantido |
| people_files | Transferir todos para o registro mantido |
| people_history | Transferir todo historico + adicionar evento de mesclagem |
| person_tag_assignments | Combinar tags de ambos (sem duplicar) |
| sent_emails (entity_type='person') | Atualizar entity_id |
| organizations.primary_contact_id | Se o contato excluido era principal, atualizar para o mantido |

---

## Arquivos a Criar/Modificar

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/components/people/MergeContactsDialog.tsx` | Criar | Dialog principal de mesclagem |
| `src/components/people/MergeFieldSelector.tsx` | Criar | Componente para selecionar valores de cada campo |
| `src/hooks/useMergeContacts.ts` | Criar | Hook com logica de mesclagem |
| `src/pages/PersonDetails.tsx` | Modificar | Adicionar opcao "Mesclar" no menu |
| `src/pages/People.tsx` | Modificar | Adicionar botao "Mesclar" na barra de selecao |
| `src/components/people/PeopleTable.tsx` | Modificar | Passar handler de mesclagem |

---

## Detalhes Tecnicos

### 1. Hook useMergeContacts.ts

```typescript
interface MergeContactsParams {
  keepPersonId: string;      // ID do contato que sera mantido
  deletePersonId: string;    // ID do contato que sera excluido
  mergedData: Partial<Person>; // Dados finais escolhidos pelo usuario
}

async function mergeContacts(params: MergeContactsParams) {
  // 1. Atualizar o registro mantido com os dados mesclados
  await supabase.from('people').update(mergedData).eq('id', keepPersonId);
  
  // 2. Transferir atividades
  await supabase.from('activities')
    .update({ person_id: keepPersonId })
    .eq('person_id', deletePersonId);
  
  // 3. Transferir negocios
  await supabase.from('deals')
    .update({ person_id: keepPersonId })
    .eq('person_id', deletePersonId);
  
  // 4. Transferir notas
  await supabase.from('people_notes')
    .update({ person_id: keepPersonId })
    .eq('person_id', deletePersonId);
  
  // 5. Transferir arquivos
  await supabase.from('people_files')
    .update({ person_id: keepPersonId })
    .eq('person_id', deletePersonId);
  
  // 6. Transferir historico
  await supabase.from('people_history')
    .update({ person_id: keepPersonId })
    .eq('person_id', deletePersonId);
  
  // 7. Combinar tags (remover duplicatas)
  const existingTags = await supabase.from('person_tag_assignments')
    .select('tag_id')
    .eq('person_id', keepPersonId);
  
  const otherTags = await supabase.from('person_tag_assignments')
    .select('tag_id')
    .eq('person_id', deletePersonId);
  
  // Adicionar tags que nao existem no mantido
  const newTags = otherTags.filter(t => !existingTags.includes(t.tag_id));
  if (newTags.length > 0) {
    await supabase.from('person_tag_assignments')
      .insert(newTags.map(t => ({ person_id: keepPersonId, tag_id: t.tag_id })));
  }
  
  // Remover assignments do contato excluido
  await supabase.from('person_tag_assignments')
    .delete()
    .eq('person_id', deletePersonId);
  
  // 8. Transferir emails enviados
  await supabase.from('sent_emails')
    .update({ entity_id: keepPersonId })
    .eq('entity_type', 'person')
    .eq('entity_id', deletePersonId);
  
  // 9. Atualizar primary_contact_id nas organizacoes
  await supabase.from('organizations')
    .update({ primary_contact_id: keepPersonId })
    .eq('primary_contact_id', deletePersonId);
  
  // 10. Registrar evento no historico
  await supabase.from('people_history').insert({
    person_id: keepPersonId,
    event_type: 'contacts_merged',
    description: `Contato mesclado com "${deletedPersonName}"`,
    metadata: { deleted_person_id: deletePersonId }
  });
  
  // 11. Excluir o contato duplicado
  await supabase.from('people').delete().eq('id', deletePersonId);
}
```

### 2. MergeContactsDialog.tsx

```typescript
interface MergeContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person1: Person;
  person2: Person;
  onSuccess: () => void;
}

// Lista de campos para mesclagem
const MERGE_FIELDS = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'cpf', label: 'CPF' },
  { key: 'job_title', label: 'Cargo' },
  { key: 'organization_id', label: 'Organizacao' },
  { key: 'label', label: 'Status' },
  { key: 'lead_source', label: 'Origem' },
  { key: 'notes', label: 'Observacoes' },
];

// Estado inicial: selecionar automaticamente o valor nao-vazio mais antigo
```

### 3. Modificar PersonDetails.tsx

Adicionar botao no DropdownMenu do header:
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="icon">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setMergeDialogOpen(true)}>
      <GitMerge className="h-4 w-4 mr-2" />
      Mesclar com outro contato...
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      <Trash className="h-4 w-4 mr-2" />
      Excluir contato
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 4. Adicionar Busca de Segundo Contato

Quando iniciado da pagina de detalhes, mostrar um dialog de busca:
```typescript
<ContactSearchDialog
  open={searchOpen}
  onOpenChange={setSearchOpen}
  excludeId={person.id}
  onSelect={(selectedPerson) => {
    setSecondPerson(selectedPerson);
    setMergeDialogOpen(true);
  }}
/>
```

---

## Fluxo de Mesclagem

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuario seleciona 2 contatos ou clica "Mesclar" na pagina   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Dialog abre mostrando campos lado a lado                    │
│    - Usuario escolhe qual valor manter para cada campo         │
│    - Sistema pre-seleciona valores nao-vazios automaticamente  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Usuario confirma a mesclagem                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Sistema executa:                                            │
│    a) Atualiza registro mantido com dados escolhidos           │
│    b) Transfere todas as relacoes (atividades, negocios, etc)  │
│    c) Registra evento no historico                             │
│    d) Exclui registro duplicado                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Redireciona para pagina do contato mesclado                 │
│    - Toast de sucesso com detalhes                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validacoes e Seguranca

1. **Permissao**: Apenas usuarios autenticados podem mesclar
2. **Confirmacao**: Dialog de confirmacao antes de executar
3. **Reversibilidade**: Nao reversivel - avisar usuario claramente
4. **Historico**: Registrar evento de mesclagem para auditoria
5. **Transacao**: Idealmente usar transacao do banco (ou rollback manual em caso de erro)

---

## Resumo da Implementacao

1. **Criar MergeContactsDialog.tsx**: Interface de selecao de campos
2. **Criar useMergeContacts.ts**: Hook com toda a logica de mesclagem
3. **Modificar PersonDetails.tsx**: Adicionar menu com opcao de mesclagem
4. **Modificar People.tsx**: Adicionar botao na barra de selecao
5. **Criar ContactSearchDialog.tsx**: Para buscar segundo contato quando iniciado da pagina de detalhes

---

## Beneficios

- Elimina contatos duplicados mantendo todos os dados
- Consolida historico, notas, arquivos e negocios
- Interface intuitiva para escolher qual valor manter
- Compativel com dados importados do Pipedrive
- Auditoria completa via historico
