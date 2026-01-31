
# Funcionalidade de Desfazer Mesclagem

## Objetivo

Adicionar a capacidade de desfazer uma mesclagem de contatos ou organizacoes, salvando um backup temporario dos dados antes da mesclagem ser executada.

---

## Arquitetura da Solucao

### Abordagem: Backup em Tabela Dedicada

Criar uma tabela `merge_backups` no banco de dados que armazena:
- Dados completos do registro excluido
- IDs das relacoes transferidas (para reverter)
- Estado anterior do registro mantido
- Expiracao automatica (ex: 30 dias)

---

## Nova Tabela: merge_backups

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | ID do backup |
| entity_type | text | 'person' ou 'organization' |
| kept_entity_id | uuid | ID do registro que foi mantido |
| deleted_entity_id | uuid | ID do registro que foi excluido |
| deleted_entity_data | jsonb | Dados completos do registro excluido |
| kept_entity_previous_data | jsonb | Estado anterior do registro mantido |
| transferred_relations | jsonb | IDs de atividades, negocios, etc transferidos |
| merged_by | uuid | Usuario que fez a mesclagem |
| created_at | timestamp | Data da mesclagem |
| expires_at | timestamp | Data de expiracao do backup (30 dias) |
| is_restored | boolean | Se ja foi restaurado |

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useMergeBackups.ts` | Hook para listar e restaurar backups |
| `src/hooks/useUndoMergeContact.ts` | Hook para desfazer mesclagem de contato |
| `src/hooks/useUndoMergeOrganization.ts` | Hook para desfazer mesclagem de organizacao |
| `src/components/shared/MergeUndoToast.tsx` | Toast com botao de desfazer |
| `src/components/shared/MergeBackupsList.tsx` | Lista de mesclagens que podem ser desfeitas |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/hooks/useMergeContacts.ts` | Salvar backup antes de mesclar |
| `src/hooks/useMergeOrganizations.ts` | Salvar backup antes de mesclar |
| `src/pages/PersonDetails.tsx` | Mostrar opcao de desfazer se houver backup |
| `src/pages/OrganizationDetails.tsx` | Mostrar opcao de desfazer se houver backup |

---

## Detalhes Tecnicos

### 1. Migracao do Banco de Dados

```sql
CREATE TABLE merge_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization')),
  kept_entity_id UUID NOT NULL,
  deleted_entity_id UUID NOT NULL,
  deleted_entity_data JSONB NOT NULL,
  kept_entity_previous_data JSONB NOT NULL,
  transferred_relations JSONB NOT NULL DEFAULT '{}',
  merged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  is_restored BOOLEAN DEFAULT false
);

-- Indice para buscar backups ativos
CREATE INDEX idx_merge_backups_active ON merge_backups (kept_entity_id, entity_type) 
WHERE is_restored = false AND expires_at > now();

-- RLS policies
ALTER TABLE merge_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view merge backups" ON merge_backups
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert backups" ON merge_backups
  FOR INSERT WITH CHECK (auth.uid() = merged_by);

CREATE POLICY "Users can update own backups" ON merge_backups
  FOR UPDATE USING (auth.uid() = merged_by OR has_role(auth.uid(), 'admin'));
```

### 2. Modificacao do useMergeContacts.ts

```typescript
// Antes de fazer qualquer alteracao:

// 1. Buscar dados completos do contato que sera excluido
const { data: deletedPersonData } = await supabase
  .from('people')
  .select('*')
  .eq('id', deletePersonId)
  .single();

// 2. Buscar dados atuais do contato mantido (antes da alteracao)
const { data: keptPersonPreviousData } = await supabase
  .from('people')
  .select('*')
  .eq('id', keepPersonId)
  .single();

// 3. Buscar IDs das relacoes que serao transferidas
const { data: activitiesToTransfer } = await supabase
  .from('activities')
  .select('id')
  .eq('person_id', deletePersonId);

const { data: dealsToTransfer } = await supabase
  .from('deals')
  .select('id')
  .eq('person_id', deletePersonId);

// ... buscar notas, arquivos, tags, emails, etc

// 4. Salvar backup
const { error: backupError } = await supabase
  .from('merge_backups')
  .insert({
    entity_type: 'person',
    kept_entity_id: keepPersonId,
    deleted_entity_id: deletePersonId,
    deleted_entity_data: deletedPersonData,
    kept_entity_previous_data: keptPersonPreviousData,
    transferred_relations: {
      activities: activitiesToTransfer?.map(a => a.id) || [],
      deals: dealsToTransfer?.map(d => d.id) || [],
      notes: notesToTransfer?.map(n => n.id) || [],
      files: filesToTransfer?.map(f => f.id) || [],
      tags: tagsToTransfer?.map(t => t.tag_id) || [],
      emails: emailsToTransfer?.map(e => e.id) || [],
    },
    merged_by: user.id,
  });

if (backupError) throw backupError;

// 5. Continuar com a mesclagem normal...
```

### 3. Hook useUndoMergeContact.ts

```typescript
export function useUndoMergeContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const undoMutation = useMutation({
    mutationFn: async (backupId: string) => {
      // 1. Buscar backup
      const { data: backup, error: fetchError } = await supabase
        .from('merge_backups')
        .select('*')
        .eq('id', backupId)
        .eq('entity_type', 'person')
        .eq('is_restored', false)
        .single();

      if (fetchError || !backup) throw new Error('Backup nao encontrado');

      // 2. Restaurar o contato excluido
      const deletedData = backup.deleted_entity_data as Person;
      const { error: insertError } = await supabase
        .from('people')
        .insert({
          ...deletedData,
          id: backup.deleted_entity_id, // Usar o mesmo ID original
        });

      if (insertError) throw insertError;

      // 3. Reverter dados do contato mantido para estado anterior
      const previousData = backup.kept_entity_previous_data as Person;
      const { error: revertError } = await supabase
        .from('people')
        .update(previousData)
        .eq('id', backup.kept_entity_id);

      if (revertError) throw revertError;

      // 4. Reverter transferencia de relacoes
      const relations = backup.transferred_relations as TransferredRelations;

      // Atividades
      if (relations.activities?.length > 0) {
        await supabase
          .from('activities')
          .update({ person_id: backup.deleted_entity_id })
          .in('id', relations.activities);
      }

      // Negocios
      if (relations.deals?.length > 0) {
        await supabase
          .from('deals')
          .update({ person_id: backup.deleted_entity_id })
          .in('id', relations.deals);
      }

      // ... reverter notas, arquivos, tags, emails

      // 5. Marcar backup como restaurado
      await supabase
        .from('merge_backups')
        .update({ is_restored: true })
        .eq('id', backupId);

      // 6. Registrar no historico
      await supabase.from('people_history').insert({
        person_id: backup.kept_entity_id,
        event_type: 'merge_undone',
        description: `Mesclagem com "${deletedData.name}" desfeita`,
        metadata: { restored_person_id: backup.deleted_entity_id },
        created_by: user.id,
      });

      return { restoredPersonId: backup.deleted_entity_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Mesclagem desfeita com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao desfazer mesclagem:', error);
      toast.error('Erro ao desfazer mesclagem: ' + error.message);
    },
  });

  return {
    undoMerge: undoMutation.mutateAsync,
    isUndoing: undoMutation.isPending,
  };
}
```

### 4. Toast com Botao de Desfazer

Apos mesclagem bem sucedida, mostrar toast especial:

```typescript
// No onSuccess do merge
toast.success(
  <div className="flex items-center gap-3">
    <span>Contatos mesclados com sucesso!</span>
    <Button
      size="sm"
      variant="outline"
      onClick={() => undoMerge(backupId)}
    >
      <Undo2 className="h-4 w-4 mr-1" />
      Desfazer
    </Button>
  </div>,
  { duration: 10000 } // 10 segundos para decidir
);
```

### 5. Estrutura de transferred_relations

```typescript
interface TransferredRelations {
  activities: string[];     // IDs das atividades transferidas
  deals: string[];          // IDs dos negocios transferidos
  notes: string[];          // IDs das notas transferidas
  files: string[];          // IDs dos arquivos transferidos
  tags: string[];           // IDs das tags adicionadas
  emails: string[];         // IDs dos emails transferidos
  orgs_primary_contact?: string[]; // Organizacoes que tinham este como contato principal
}
```

---

## Fluxo de Desfazer Mesclagem

```text
1. Usuario clica em "Desfazer" no toast ou na pagina de detalhes
                    |
                    v
2. Sistema busca o backup mais recente
                    |
                    v
3. Recria o registro excluido com o mesmo ID original
                    |
                    v
4. Reverte os dados do registro mantido para estado anterior
                    |
                    v
5. Move as relacoes de volta para o registro restaurado
   - Atividades com IDs salvos -> person_id original
   - Negocios com IDs salvos -> person_id original
   - Notas, arquivos, tags, emails
                    |
                    v
6. Marca backup como restaurado
                    |
                    v
7. Registra evento no historico
                    |
                    v
8. Toast de sucesso + refresh das queries
```

---

## Interface do Usuario

### Na Pagina de Detalhes

Se existir um backup recente para este registro:

```text
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ Este registro foi mesclado recentemente                   │
│                                                              │
│ Wilson foi mesclado em 31/01/2025 as 15:30                   │
│ O contato "Wilson teste" foi excluido na mesclagem.          │
│                                                              │
│ [Desfazer mesclagem]                 Expira em: 29 dias      │
└──────────────────────────────────────────────────────────────┘
```

### No Toast Pos-Mesclagem

```text
┌──────────────────────────────────────────────────────────────┐
│ ✓ Contatos mesclados com sucesso!        [Desfazer] [X]      │
└──────────────────────────────────────────────────────────────┘
```

---

## Consideracoes Importantes

1. **Janela de Tempo**: Backup expira em 30 dias (configuravel)
2. **Limites de Storage**: Backups antigos podem ser limpos por job agendado
3. **Integridade**: Se o registro mantido for editado apos a mesclagem, o undo restaura o estado anterior
4. **Arquivos Storage**: Os arquivos em si nao sao duplicados, apenas os metadados
5. **Multiplas Mesclagens**: Se o mesmo registro foi mesclado multiplas vezes, cada mesclagem tem seu backup

---

## Resumo de Implementacao

1. **Migracao SQL**: Criar tabela `merge_backups` com RLS
2. **Modificar useMergeContacts.ts**: Salvar backup antes de mesclar
3. **Modificar useMergeOrganizations.ts**: Salvar backup antes de mesclar  
4. **Criar useUndoMergeContact.ts**: Logica para desfazer mesclagem de pessoa
5. **Criar useUndoMergeOrganization.ts**: Logica para desfazer mesclagem de org
6. **Criar useMergeBackups.ts**: Hook para listar backups disponiveis
7. **Modificar PersonDetails.tsx**: Mostrar banner se houver backup
8. **Modificar OrganizationDetails.tsx**: Mostrar banner se houver backup
9. **Modificar dialogs de mesclagem**: Toast com botao de desfazer

---

## Beneficios

- Seguranca para o usuario em caso de erro
- Dados nunca sao perdidos permanentemente (por 30 dias)
- Interface intuitiva com toast e banner
- Restauracao completa incluindo todas as relacoes
- Auditoria via historico de eventos
