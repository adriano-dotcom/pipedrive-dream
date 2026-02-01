
# Plano de Integração: Casa dos Dados API para Enriquecimento de Cadastros

## Objetivo
Integrar a API da Casa dos Dados ao CRM para atualizar automaticamente os dados das organizações cadastradas, enriquecendo-os com informações oficiais da Receita Federal, incluindo dados cadastrais, endereço, CNAEs e quadro societario.

---

## Arquitetura da Solucao

```text
+-------------------+     +------------------------+     +----------------------+
|  Frontend         |     |  Edge Function         |     |  Casa dos Dados API  |
|  (React)          | --> |  enrich-organization   | --> |  v4/cnpj/{cnpj}      |
|                   |     |                        |     |                      |
| - Botao Atualizar |     | - Valida CNPJ          |     | - Dados oficiais RF  |
| - Sidebar org     |     | - Chama API externa    |     | - Quadro societario  |
| - Historico       |     | - Salva no Supabase    |     | - Capital social     |
+-------------------+     +------------------------+     +----------------------+
         |                          |
         v                          v
+---------------------------------------------------+
|                   Supabase Database               |
|  - organizations (campos novos)                   |
|  - organization_partners (nova tabela - socios)   |
|  - organization_history (log de enriquecimento)   |
+---------------------------------------------------+
```

---

## 1. Analise de Mapeamento: API vs Banco de Dados

### Campos Retornados pela API Casa dos Dados (v4)

| Campo API                     | Descricao                              | Existe no DB? | Campo DB                   |
|-------------------------------|----------------------------------------|---------------|----------------------------|
| `razao_social`                | Razao social                           | Sim           | `name`                     |
| `nome_fantasia`               | Nome fantasia                          | Nao           | **Criar: `trade_name`**    |
| `cnpj`                        | CNPJ formatado                         | Sim           | `cnpj`                     |
| `porte_empresa.descricao`     | Porte (ME, EPP, etc)                   | Nao           | **Criar: `company_size`**  |
| `matriz_filial`               | Matriz ou Filial                       | Nao           | **Criar: `branch_type`**   |
| `codigo_natureza_juridica`    | Codigo natureza juridica               | Nao           | **Criar: `legal_nature_code`** |
| `descricao_natureza_juridica` | Descricao natureza juridica            | Nao           | **Criar: `legal_nature`**  |
| `data_abertura`               | Data de abertura                       | Nao           | **Criar: `founded_date`**  |
| `capital_social`              | Capital social em centavos             | Nao           | **Criar: `share_capital`** |
| `situacao_cadastral.situacao_cadastral` | Situacao na RF              | Nao           | **Criar: `registration_status`** |
| `situacao_cadastral.data`     | Data da situacao                       | Nao           | **Criar: `registration_status_date`** |
| `endereco.logradouro`         | Rua                                    | Sim           | `address_street`           |
| `endereco.numero`             | Numero                                 | Sim           | `address_number`           |
| `endereco.complemento`        | Complemento                            | Sim           | `address_complement`       |
| `endereco.bairro`             | Bairro                                 | Sim           | `address_neighborhood`     |
| `endereco.municipio`          | Cidade                                 | Sim           | `address_city`             |
| `endereco.uf`                 | Estado                                 | Sim           | `address_state`            |
| `endereco.cep`                | CEP                                    | Sim           | `address_zipcode`          |
| `endereco.ibge.latitude`      | Latitude                               | Nao           | **Criar: `latitude`**      |
| `endereco.ibge.longitude`     | Longitude                              | Nao           | **Criar: `longitude`**     |
| `quadro_societario[]`         | Lista de socios                        | Nao           | **Nova tabela**            |

---

## 2. Alteracoes no Banco de Dados

### 2.1 Novos Campos na Tabela `organizations`

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trade_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS branch_type text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_nature_code text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_nature text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS founded_date date;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS share_capital numeric;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS registration_status text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS registration_status_date date;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_enriched_at timestamp with time zone;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enrichment_source text;
```

### 2.2 Nova Tabela: `organization_partners` (Quadro Societario)

```sql
CREATE TABLE IF NOT EXISTS organization_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  document text,                         -- CPF/CNPJ do socio
  qualification text,                    -- Qualificacao (Socio-Administrador, etc)
  qualification_code integer,
  entry_date date,                       -- Data entrada na sociedade
  country text,                          -- Pais do socio
  legal_rep_name text,                   -- Nome representante legal
  legal_rep_document text,               -- CPF representante legal
  legal_rep_qualification text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indice para busca rapida por organizacao
CREATE INDEX IF NOT EXISTS idx_organization_partners_org_id 
  ON organization_partners(organization_id);

-- RLS policies
ALTER TABLE organization_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view organization partners" 
  ON organization_partners FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert organization partners" 
  ON organization_partners FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update organization partners" 
  ON organization_partners FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete organization partners" 
  ON organization_partners FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));
```

---

## 3. Configuracao da API Key

A API Casa dos Dados requer uma chave (`api-key`) no header. Sera necessario:

1. **Solicitar chave ao usuario** via ferramenta de secrets do Lovable
2. **Armazenar** como `CASA_DOS_DADOS_API_KEY` nos secrets do projeto
3. **Usar** na Edge Function para autenticar chamadas

---

## 4. Nova Edge Function: `enrich-organization`

### Responsabilidades:
1. Receber `organizationId` e opcionalmente `cnpj`
2. Buscar CNPJ no banco se nao fornecido
3. Chamar API Casa dos Dados (`GET /v4/cnpj/{cnpj}`)
4. Mapear resposta para campos do banco
5. Atualizar tabela `organizations`
6. Sincronizar quadro societario na tabela `organization_partners`
7. Registrar evento no `organization_history`

### Fluxo de Atualizacao de Socios:
- Deletar socios existentes da organizacao
- Inserir todos os socios retornados pela API
- Abordagem "sync completo" para simplicidade

---

## 5. Alteracoes no Frontend

### 5.1 Botao "Atualizar Dados" na Pagina de Detalhes

**Arquivo:** `src/pages/OrganizationDetails.tsx`

- Adicionar botao "Atualizar via Receita Federal" no header
- Estado de loading durante chamada
- Feedback visual (toast) com sucesso/erro
- Invalidar queries apos sucesso

### 5.2 Exibir Novos Campos no Sidebar

**Arquivo:** `src/components/organizations/detail/OrganizationSidebar.tsx`

Novo card "Dados da Receita Federal":
- Nome Fantasia
- Porte da Empresa
- Natureza Juridica
- Data de Abertura
- Capital Social (formatado BRL)
- Situacao Cadastral (com badge colorido)
- Data ultima atualizacao

### 5.3 Nova Secao: Quadro Societario

**Novo arquivo:** `src/components/organizations/detail/OrganizationPartners.tsx`

- Card com lista de socios
- Para cada socio: Nome, Qualificacao, Documento (mascaro), Data entrada
- Indicador visual se for representante legal

### 5.4 Registro no Historico

O evento de enriquecimento sera registrado automaticamente via edge function:
- `event_type: 'enrichment'`
- `description: 'Dados atualizados via Casa dos Dados'`

---

## 6. Hook Personalizado

**Novo arquivo:** `src/hooks/useEnrichOrganization.ts`

```typescript
// Hook para gerenciar enriquecimento de organizacao
// - Chama edge function enrich-organization
// - Gerencia estado de loading
// - Invalida queries apos sucesso
// - Trata erros com toast
```

---

## 7. Arquivos a Criar/Modificar

### Novos Arquivos:
| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/enrich-organization/index.ts` | Edge function principal |
| `src/hooks/useEnrichOrganization.ts` | Hook para enriquecimento |
| `src/hooks/useOrganizationPartners.ts` | Hook para buscar socios |
| `src/components/organizations/detail/OrganizationPartners.tsx` | Componente quadro societario |
| `src/components/organizations/detail/OrganizationRFCard.tsx` | Card dados Receita Federal |

### Arquivos a Modificar:
| Arquivo | Alteracao |
|---------|-----------|
| `supabase/config.toml` | Adicionar config da nova function |
| `src/pages/OrganizationDetails.tsx` | Botao atualizar + nova tab socios |
| `src/components/organizations/detail/OrganizationSidebar.tsx` | Card RF |
| `src/hooks/useOrganizationDetails.ts` | Incluir novos campos |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente apos migration |

---

## 8. Tratamento de Erros

| Cenario | Acao |
|---------|------|
| CNPJ nao cadastrado na org | Toast warning solicitando cadastrar CNPJ |
| CNPJ invalido (formato) | Toast error com mensagem especifica |
| CNPJ nao encontrado na RF | Toast info "Empresa nao localizada" |
| API key invalida (401) | Toast error orientando configurar chave |
| Saldo insuficiente (403) | Toast error sobre creditos da API |
| Erro generico | Toast error com mensagem da API |

---

## 9. Seguranca

- **API Key**: Armazenada nos secrets, nunca exposta ao frontend
- **RLS**: Tabela de socios segue mesmo padrao de organizations
- **Validacao**: CNPJ validado antes de chamar API externa
- **Rate Limiting**: Considerar debounce no botao para evitar multiplas chamadas

---

## 10. Checklist de Implementacao

1. [ ] Solicitar API key da Casa dos Dados ao usuario
2. [ ] Criar migration com novos campos e tabela de socios
3. [ ] Criar edge function `enrich-organization`
4. [ ] Criar hook `useEnrichOrganization`
5. [ ] Criar hook `useOrganizationPartners`
6. [ ] Criar componente `OrganizationPartners`
7. [ ] Criar componente `OrganizationRFCard`
8. [ ] Adicionar botao "Atualizar Dados" no header
9. [ ] Adicionar tab "Socios" nas tabs de detalhes
10. [ ] Testar fluxo completo end-to-end
11. [ ] Verificar registro no historico

---

## Proximos Passos Apos Aprovacao

1. Solicitar a chave da API Casa dos Dados
2. Aplicar migration no banco de dados
3. Implementar edge function
4. Implementar componentes frontend
5. Testar com CNPJ real
