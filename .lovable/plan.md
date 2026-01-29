
# Sprint 3: Funcionalidade de Exportação de Dados (CSV/Excel)

## Objetivo
Adicionar botões de exportação em todas as tabelas de listagem, permitindo exportar os dados filtrados e visíveis para CSV e Excel.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        BARRA DE FERRAMENTAS                         │
├─────────────────────────────────────────────────────────────────────┤
│  [📥 CSV] [📥 Excel]                              [⚙️ Colunas]      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     src/lib/export.ts                               │
├─────────────────────────────────────────────────────────────────────┤
│ - exportToCSV(data, columns, filename)                              │
│ - exportToExcel(data, columns, filename)                            │
│ - downloadFile(content, filename, mimeType)                         │
│ - formatValue(value, type)                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

### 1. `src/lib/export.ts` - Utilitário de Exportação

Funções principais:

```typescript
interface ExportColumn {
  id: string;
  label: string;
  accessor: (row: any) => string | number | null;
}

// Exportar para CSV
export function exportToCSV(
  data: any[],
  columns: ExportColumn[],
  filename: string
): void;

// Exportar para Excel (formato XLSX simplificado ou HTML)
export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string
): void;

// Utilitário para formatar valores
function formatValue(value: any): string;

// Utilitário para download
function downloadFile(content: string, filename: string, mimeType: string): void;
```

**Características:**
- Sem dependências externas (não precisa instalar xlsx)
- CSV com encoding UTF-8 BOM para suporte a acentos
- Excel gerado como HTML com extensão .xls (compatível com Excel/LibreOffice)
- Formatação automática de datas, valores monetários e telefones

---

## Arquivos a Modificar

### 2. `src/components/people/PeopleTable.tsx`

**Mudanças:**
- Adicionar imports de `exportToCSV` e `exportToExcel`
- Definir `exportColumns` com mapeamento de dados
- Adicionar botões de exportação na barra de ferramentas

```text
┌────────────────────────────────────────────────────────┐
│ [📥 CSV] [📥 Excel]                     [⚙️ Colunas]  │
├────────────────────────────────────────────────────────┤
│ Nome  │ Telefone │ Email │ Empresa │ CNPJ │ Cidade   │
```

**Colunas exportáveis:**
| Coluna | Valor Exportado |
|--------|-----------------|
| Nome | `person.name` |
| CPF | `person.cpf` |
| Telefone | `person.phone` |
| WhatsApp | `person.whatsapp` |
| Email | `person.email` |
| Empresa | `person.organizations?.name` |
| CNPJ | `person.organizations?.cnpj` |
| Cargo | `person.job_title` |
| Cidade | `organizations?.address_city/address_state` |
| Automotores | `organizations?.automotores` |
| Status | `person.label` |

---

### 3. `src/components/organizations/OrganizationsTable.tsx`

**Mudanças similares ao PeopleTable**

**Colunas exportáveis:**
| Coluna | Valor Exportado |
|--------|-----------------|
| Nome | `organization.name` |
| CNPJ | `organization.cnpj` |
| Automotores | `organization.automotores` |
| Contato Principal | `primary_contact?.name` |
| Telefone Contato | `primary_contact?.phone` |
| Email Contato | `primary_contact?.email` |
| Cidade | `address_city/address_state` |
| Status | `organization.label` |

---

### 4. `src/components/activities/ActivitiesTable.tsx`

**Colunas exportáveis:**
| Coluna | Valor Exportado |
|--------|-----------------|
| Assunto | `activity.title` |
| Tipo | `activity.activity_type` (traduzido) |
| Data de Vencimento | `activity.due_date` (formatada) |
| Hora | `activity.due_time` |
| Pessoa | `activity.person?.name` |
| Organização | `activity.organization?.name` |
| Telefone | `activity.person?.phone` |
| Email | `activity.person?.email` |
| Vinculado a | Deal/Person/Organization name |
| Criado por | `activity.creator?.full_name` |
| Status | Concluída/Pendente |
| Prioridade | `activity.priority` (traduzido) |

---

### 5. `src/components/deals/DealsTable.tsx`

**Colunas exportáveis:**
| Coluna | Valor Exportado |
|--------|-----------------|
| Título | `deal.title` |
| Valor | `deal.value` (formatado R$) |
| Etapa | `deal.stage?.name` |
| Status | `deal.status` (traduzido) |
| Pessoa | `deal.person?.name` |
| Organização | `deal.organization?.name` |
| Tipo de Seguro | `deal.insurance_type` (traduzido) |
| Etiqueta | `deal.label` (traduzido) |
| Data Criação | `deal.created_at` (formatada) |
| Previsão Fechamento | `deal.expected_close_date` (formatada) |

---

## Componente Reutilizável (Opcional)

### 6. `src/components/shared/ExportButtons.tsx`

Componente para encapsular os botões de exportação:

```tsx
interface ExportButtonsProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
}

export function ExportButtons({ data, columns, filename }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => exportToCSV(data, columns, filename)}>
        <Download className="h-4 w-4 mr-2" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportToExcel(data, columns, filename)}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Excel
      </Button>
    </div>
  );
}
```

---

## Fluxo de Exportação

```text
Usuário clica "Exportar CSV"
         │
         ▼
┌────────────────────────────┐
│ 1. Pegar dados filtrados   │  (respeitando filtros e busca ativos)
│    da tabela atual         │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ 2. Mapear colunas visíveis │  (respeitando columnVisibility)
│    para exportColumns      │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ 3. Formatar valores        │  (datas, moedas, telefones)
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ 4. Gerar arquivo           │  (CSV com BOM ou HTML table)
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ 5. Trigger download        │  (Blob + link.click())
└────────────────────────────┘
```

---

## Detalhes de Implementação

### Formato CSV
- Encoding: UTF-8 com BOM (`\uFEFF`) para compatibilidade com Excel
- Separador: `;` (padrão brasileiro, melhor suporte a valores com vírgulas)
- Aspas: Valores com quebra de linha ou `;` são envolvidos em aspas
- Nome do arquivo: `{entidade}_{data_hora}.csv`

### Formato Excel
- Formato: HTML Table com extensão `.xls`
- Vantagens: Sem dependências, funciona em Excel/LibreOffice/Google Sheets
- Estilo: Headers em negrito, bordas simples
- Nome do arquivo: `{entidade}_{data_hora}.xls`

---

## Exemplo de Arquivo CSV Gerado

```csv
Nome;CPF;Telefone;Email;Empresa;CNPJ;Cargo;Cidade;Status
João Silva;123.456.789-00;(11) 99999-9999;joao@email.com;Empresa ABC;12.345.678/0001-99;Gerente;São Paulo/SP;Quente
Maria Santos;;(21) 88888-8888;maria@email.com;XYZ Ltda;;Diretora;Rio de Janeiro/RJ;Morno
```

---

## Estimativa de Tempo

| Tarefa | Tempo |
|--------|-------|
| Criar `src/lib/export.ts` | 1-2h |
| Integrar em PeopleTable | 1h |
| Integrar em OrganizationsTable | 1h |
| Integrar em ActivitiesTable | 1h |
| Integrar em DealsTable | 1h |
| Criar ExportButtons (opcional) | 0.5h |
| Testes e ajustes | 1-2h |
| **Total** | **6-9h** |

---

## Atualização do plan.md

Após implementação, marcar Sprint 3 como concluído:

```markdown
### SPRINT 3: Exportação de Dados (8-10h) ✅ CONCLUÍDO

#### 3.1 Implementar Exportação CSV/Excel ✅
- `src/lib/export.ts` criado com funções `exportToCSV` e `exportToExcel`
- Botões de exportação adicionados em todas as tabelas
- Suporte a encoding UTF-8 com BOM para acentos
- Respeita filtros e colunas visíveis ao exportar

**Arquivos criados:**
- `src/lib/export.ts`
- `src/components/shared/ExportButtons.tsx` (opcional)

**Arquivos modificados:**
- `src/components/people/PeopleTable.tsx`
- `src/components/organizations/OrganizationsTable.tsx`
- `src/components/activities/ActivitiesTable.tsx`
- `src/components/deals/DealsTable.tsx`
```
