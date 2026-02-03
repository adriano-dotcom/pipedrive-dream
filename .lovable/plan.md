
# Auditoria de Seguranca e Desempenho do Banco de Dados

## Resumo Executivo

A auditoria identificou **23 problemas**, sendo **17 criticos de seguranca** e **6 avisos de desempenho/configuracao**. O problema mais grave e que **dados sensiveis estao acessiveis publicamente** sem autenticacao.

---

## PROBLEMAS CRITICOS DE SEGURANCA (17 issues)

### 1. Policies RLS com Role `public` em vez de `authenticated`

Varias tabelas com dados sensiveis tem policies de SELECT aplicadas ao role `public` em vez de `authenticated`, permitindo acesso **sem login**:

| Tabela | Dados Expostos | Risco |
|--------|----------------|-------|
| `people` | Emails, telefones, WhatsApp, CPF | Identidade, LGPD |
| `organizations` | CNPJ, emails, telefones, dados financeiros | Inteligencia competitiva |
| `organization_partners` | Documentos de socios, dados de representantes legais | Fraude |
| `sent_emails` | Conteudo completo de emails | Comunicacoes confidenciais |
| `whatsapp_messages` | Mensagens de clientes | Violacao de privacidade |
| `whatsapp_channels` | Numeros de telefone comerciais | Spam, impersonacao |
| `deal_notes` | Notas internas sobre negocios | Estrategia de vendas |
| `people_notes` | Notas sobre clientes | Relacionamento com clientes |
| `organization_notes` | Notas sobre organizacoes | Inteligencia interna |
| `deal_history` | Historico de alteracoes em deals | Pipeline de vendas |
| `people_history` | Historico de contatos | Relacionamentos |
| `organization_history` | Historico de organizacoes | Operacoes |
| `organization_files` | Metadados de arquivos | Nomes de documentos confidenciais |
| `whatsapp_conversation_analysis` | Metricas de qualidade | Performance interna |
| `profiles` | Nomes e telefones de funcionarios | Dados de RH |

### 2. Policies com `USING (true)` sem restricao de role

Policies aplicadas a `public` (nao autenticados) com `USING (true)`:

```sql
-- PROBLEMA: Qualquer pessoa pode ver
roles:{public} qual:true
```

### 3. Leaked Password Protection Desabilitada

A protecao contra senhas vazadas esta desativada, permitindo que usuarios usem senhas comprometidas em vazamentos de dados.

---

## PROBLEMAS DE DESEMPENHO (6 issues)

### 1. Indices GIN Nao Utilizados

Os seguintes indices GIN (216KB + 128KB) **nunca foram usados**:

| Indice | Tamanho | Uso |
|--------|---------|-----|
| `idx_organizations_name_gin` | 216 KB | 0 scans |
| `idx_organizations_cnpj_gin` | 128 KB | 0 scans |

Esses indices sao para buscas `ILIKE`, mas a aplicacao pode nao estar usando-os corretamente.

### 2. Sequential Scans Excessivos

As tabelas `people` e `organizations` tem milhoes de sequential scans:

| Tabela | Seq Scans | Rows Scanned | Index Scans |
|--------|-----------|--------------|-------------|
| `organizations` | 5,680 | 2.14M | 290,195 |
| `people` | 5,502 | 2.37M | 420,597 |

Isso indica queries sem `WHERE` apropriado ou falta de indices.

### 3. Extensao pg_trgm no Schema Public

A extensao `pg_trgm` esta instalada no schema `public` em vez de `extensions`, o que pode causar problemas de seguranca.

### 4. Indices Nunca Utilizados

20+ indices nunca foram usados, ocupando espaco:

- `idx_people_email` (72 KB)
- `idx_organizations_cnpj` (56 KB)
- `idx_activities_assigned_to` (16 KB)
- E mais 17 indices...

---

## SOLUCAO PROPOSTA

### Fase 1: Corrigir Policies RLS (URGENTE)

Alterar todas as policies de SELECT de `public` para `authenticated`:

```sql
-- Exemplo para cada tabela afetada
DROP POLICY IF EXISTS "Authenticated users can view deal history" ON deal_history;
CREATE POLICY "Authenticated users can view deal history" 
  ON deal_history FOR SELECT 
  TO authenticated
  USING (true);
```

**Tabelas a corrigir (16 tabelas):**
1. deal_history
2. deal_notes
3. deal_tag_assignments
4. deal_tags
5. merge_backups
6. organization_files
7. organization_history
8. organization_notes
9. organization_partners
10. organization_tag_assignments
11. organization_tags
12. people_files
13. people_history
14. people_notes
15. person_tag_assignments
16. person_tags
17. sent_emails
18. whatsapp_channels
19. whatsapp_conversation_analysis
20. whatsapp_conversations
21. whatsapp_messages

### Fase 2: Habilitar Leaked Password Protection

Configurar protecao contra senhas vazadas nas configuracoes de autenticacao.

### Fase 3: Mover Extensao para Schema Correto

```sql
-- Recriar extensao no schema extensions
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION pg_trgm SCHEMA extensions;
```

### Fase 4: Otimizar Indices (Opcional)

Remover indices nao utilizados para liberar espaco e melhorar performance de escrita.

---

## Resumo das Alteracoes

| Categoria | Quantidade | Prioridade |
|-----------|------------|------------|
| Policies RLS a corrigir | 21 | CRITICA |
| Leaked Password Protection | 1 | ALTA |
| Extensao em schema errado | 1 | MEDIA |
| Indices nao utilizados | 20+ | BAIXA |

---

## Detalhes Tecnicos da Migration

A migracao SQL completa incluira:

1. **DROP** das policies antigas com role `public`
2. **CREATE** das novas policies com role `authenticated`
3. **Recriar extensao** pg_trgm no schema extensions

Impacto: Apos a correcao, usuarios nao autenticados **nao poderao mais acessar** nenhum dado do CRM. Apenas usuarios logados terao acesso.
