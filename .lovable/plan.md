
# Auditoria de Seguranca e Desempenho do Banco de Dados

## Resumo da Analise

Com base no scan de seguranca e nas consultas de desempenho, identifiquei **18 itens** no total. Como o modelo de acesso escolhido e **Acesso Total para Equipe** (todos os corretores e admins podem ver todos os dados), a maioria dos alertas de "dados expostos" sao **falsos positivos** para este caso de uso de CRM colaborativo.

---

## PROBLEMAS DE SEGURANCA

### Erros Identificados (6 itens) - FALSOS POSITIVOS

Os seguintes alertas de nivel "error" sao **intencionais** para um CRM de corretora de seguros onde a equipe precisa colaborar:

| Tabela | Alerta | Status |
|--------|--------|--------|
| `profiles` | Dados de funcionarios expostos | Intencional - necessario para @mencoes e atribuicoes |
| `people` | Dados de contatos acessiveis | Intencional - equipe precisa ver todos os clientes |
| `organizations` | Dados de empresas expostos | Intencional - equipe precisa ver todas as organizacoes |
| `organization_partners` | Dados de socios acessiveis | Intencional - parte do cadastro de organizacoes |
| `deals` | Informacoes de negocios visiveis | Intencional - equipe precisa ver pipeline completo |
| `whatsapp_messages` | Conversas legiveis por todos | Intencional - equipe precisa acompanhar comunicacoes |

**Acao**: Marcar estes itens como "ignorados" no sistema de auditoria, documentando que o modelo de acesso colaborativo e intencional.

### Avisos de Seguranca (10 itens) - BAIXA PRIORIDADE

| Categoria | Itens | Recomendacao |
|-----------|-------|--------------|
| Notas internas (deal_notes, people_notes, organization_notes) | 3 | Manter - colaboracao de equipe |
| Arquivos (deal_files, people_files, organization_files) | 3 | Manter - colaboracao de equipe |
| Atividades | 1 | Manter - equipe precisa ver tarefas |
| Emails enviados | 1 | Ja corrigido - restrito ao remetente/admin |
| Merge backups | 1 | Pode restringir ao autor do merge |
| Extensao pg_trgm no schema public | 1 | Baixa prioridade - nao afeta seguranca |

### Avisos de Infraestrutura (2 itens) - SUPABASE LINTER

1. **Extension in Public**: A extensao `pg_trgm` esta no schema `public` em vez de `extensions`
   - Impacto: Baixo
   - Acao: Opcional - mover para schema `extensions`

2. **RLS Policy Always True**: Policies com `USING(true)` para SELECT
   - Impacto: Esperado para modelo de acesso colaborativo
   - Acao: Nenhuma - intencional

---

## PROBLEMAS DE DESEMPENHO

### Indices Nao Utilizados (40+ indices com 0 scans)

Os seguintes indices **nunca foram usados** e ocupam espaco desnecessario:

| Indice | Tamanho | Tabela |
|--------|---------|--------|
| `idx_organizations_name_gin` | 216 KB | organizations |
| `idx_organizations_cnpj_gin` | 128 KB | organizations |
| `idx_people_email` | 72 KB | people |
| `idx_organizations_cnpj` | 56 KB | organizations |
| `idx_organizations_city` | 32 KB | organizations |
| + 35 outros indices | ~500 KB | varias |

**Acao Recomendada**: Remover indices GIN nao utilizados (344 KB). Os indices B-tree podem ser mantidos para uso futuro.

### Indices Mais Utilizados (funcionando bem)

| Indice | Scans | Tabela |
|--------|-------|--------|
| `idx_people_organization` | 412,663 | people |
| `organizations_pkey` | 369,698 | organizations |
| `idx_people_organization_id` | 4,258 | people |
| `profiles_user_id_key` | 3,312 | profiles |
| `idx_deals_status` | 3,059 | deals |

### Sequential Scans Excessivos

| Tabela | Seq Scans | Rows Lidos | Index Scans |
|--------|-----------|------------|-------------|
| `people` | 6,101 | 2.96M | 421,223 |
| `organizations` | 5,688 | 2.15M | 372,282 |
| `pipelines` | 1,825 | 3,625 | 534 |

As tabelas `people` e `organizations` tem bom uso de indices, mas `pipelines` tem muitos seq scans (provavelmente queries sem WHERE ou tabela pequena).

---

## PLANO DE ACAO

### Fase 1: Atualizar Status de Seguranca (Imediato)

Marcar os 6 alertas de nivel "error" como **ignorados** com justificativa de modelo de acesso colaborativo, pois sao falsos positivos para este tipo de CRM.

### Fase 2: Otimizacao de Indices (Opcional)

Criar migracao para remover indices GIN nao utilizados e liberar ~344 KB:

```sql
DROP INDEX IF EXISTS idx_organizations_name_gin;
DROP INDEX IF EXISTS idx_organizations_cnpj_gin;
```

### Fase 3: Restringir Merge Backups (Opcional)

Atualizar policy da tabela `merge_backups` para restringir ao autor:

```sql
DROP POLICY IF EXISTS "Authenticated users can view merge backups" ON merge_backups;
CREATE POLICY "Users can view own merge backups or admins" ON merge_backups
  FOR SELECT TO authenticated
  USING (merged_by = auth.uid() OR has_role(auth.uid(), 'admin'));
```

---

## Secao Tecnica

### Consultas de Diagnostico Executadas

1. **Scan de Seguranca**: Identificou 18 findings (6 error, 10 warn, 2 info)
2. **Linter Supabase**: 2 avisos (extensao em public, policies com true)
3. **Estatisticas de Tabelas**: `pg_stat_user_tables` para seq_scans vs idx_scans
4. **Indices Nao Usados**: `pg_stat_user_indexes` com `idx_scan = 0`

### Modelo de Dados de Roles

O sistema usa a arquitetura correta com tabela separada `user_roles`:
- Enum `app_role`: 'admin' | 'corretor'
- Funcao `has_role()` com `SECURITY DEFINER`
- Primeiro usuario vira admin automaticamente
- Novos usuarios recebem role 'corretor' por padrao

### Conclusao

O banco de dados esta **seguro para o modelo de acesso escolhido**. Os alertas de "dados expostos" sao falsos positivos porque o CRM colaborativo requer que toda a equipe veja todos os dados. As unicas acoes recomendadas sao:

1. Documentar os falsos positivos no sistema de auditoria
2. Opcionalmente, remover indices GIN nao utilizados
3. Opcionalmente, restringir visualizacao de merge_backups
