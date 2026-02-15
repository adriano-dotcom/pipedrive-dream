

# Limpeza Completa dos Dados para Teste de Importação

## Resumo

Apagar todos os registros de todas as tabelas de dados do sistema para começar do zero e testar a importação do Pipedrive.

## Dados a Serem Removidos

| Tabela | Registros |
|--------|-----------|
| whatsapp_messages | 11 |
| whatsapp_conversations | 4 |
| whatsapp_conversation_analysis | ? |
| sent_emails | 1 |
| deal_tag_assignments | 1 |
| deal_history | 29 |
| deal_notes | 2 |
| deal_files | 0 |
| activities | 8 |
| deals | 2 |
| person_tag_assignments | 1 |
| people_notes | 1 |
| people_files | 0 |
| people_history | 25 |
| organization_tag_assignments | 1 |
| organization_notes | 2 |
| organization_files | 2 |
| organization_history | 34 |
| organization_partners | 36 |
| merge_backups | 0 |
| notifications | ? |
| people | 983 |
| organizations | 841 |

## Ordem de Execução

A limpeza precisa respeitar as dependências entre tabelas (apagar filhos antes dos pais):

```text
1. WhatsApp: messages -> conversation_analysis -> conversations
2. Emails: sent_emails
3. Deals: deal_tag_assignments -> deal_history -> deal_notes -> deal_files -> deals
4. Activities: activities
5. People: person_tag_assignments -> people_notes -> people_files -> people_history -> people
6. Organizations: organization_tag_assignments -> organization_notes -> organization_files -> organization_history -> organization_partners -> organizations
7. Outros: merge_backups, notifications
```

## Detalhes Técnicos

Será executado via ferramenta de inserção/deleção do banco de dados com os seguintes comandos SQL na ordem correta:

```sql
-- WhatsApp
DELETE FROM whatsapp_messages;
DELETE FROM whatsapp_conversation_analysis;
DELETE FROM whatsapp_conversations;

-- Emails
DELETE FROM sent_emails;

-- Deals
DELETE FROM deal_tag_assignments;
DELETE FROM deal_history;
DELETE FROM deal_notes;
DELETE FROM deal_files;
DELETE FROM activities;
DELETE FROM deals;

-- People
DELETE FROM person_tag_assignments;
DELETE FROM people_notes;
DELETE FROM people_files;
DELETE FROM people_history;

-- Organizations
DELETE FROM organization_tag_assignments;
DELETE FROM organization_notes;
DELETE FROM organization_files;
DELETE FROM organization_history;
DELETE FROM organization_partners;

-- Merge backups
DELETE FROM merge_backups;

-- Notifications
DELETE FROM notifications;

-- Main tables (last)
DELETE FROM people;
DELETE FROM organizations;
```

## Importante

- Esta acao e **irreversivel** - todos os dados serao apagados permanentemente
- Tags (person_tags, organization_tags, deal_tags) serao **mantidas** (apenas as atribuicoes serao removidas)
- Pipelines e stages serao **mantidos**
- Perfis de usuarios e roles serao **mantidos**
- Canais de WhatsApp serao **mantidos**
