
# Funcionalidade de Importação de Contatos e Empresas via CSV/Excel

## Objetivo

Criar uma funcionalidade robusta de importação que permita aos usuários importar contatos (pessoas) e empresas (organizações) em lote através de arquivos CSV ou Excel, com vinculação automática entre eles.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE IMPORTAÇÃO                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Upload do Arquivo (CSV/Excel)                                   │
│           │                                                         │
│           ▼                                                         │
│  2. Parse e Validação do Formato                                    │
│           │                                                         │
│           ▼                                                         │
│  3. Preview dos Dados (Mapeamento de Colunas)                       │
│           │                                                         │
│           ▼                                                         │
│  4. Validação de Duplicatas (CPF, CNPJ, Email)                      │
│           │                                                         │
│           ▼                                                         │
│  5. Importação com Progresso                                        │
│           │                                                         │
│           ▼                                                         │
│  6. Relatório de Resultado (sucesso/erros)                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar

### 1. Utilitário de Importação: `src/lib/import.ts`

Funções principais para parsing de arquivos:

- `parseCSV(file: File)` - Parse de arquivos CSV com suporte a UTF-8 BOM e separadores `;` e `,`
- `parseExcel(file: File)` - Parse de arquivos .xls e .xlsx
- `detectSeparator(content: string)` - Detecta automaticamente o separador CSV
- `normalizeHeaders(headers: string[])` - Normaliza cabeçalhos para mapeamento
- `validateRow(row: object, type: 'person' | 'organization')` - Valida cada linha

### 2. Componente Principal: `src/components/import/ImportDialog.tsx`

Modal com múltiplos passos:

```text
┌────────────────────────────────────────────────────────────────────┐
│                    Importar Contatos e Empresas                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ● Passo 1   ○ Passo 2   ○ Passo 3   ○ Passo 4                    │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                                                             │  │
│  │          📁  Arraste um arquivo CSV ou Excel aqui          │  │
│  │                   ou clique para selecionar                 │  │
│  │                                                             │  │
│  │               Formatos aceitos: .csv, .xls, .xlsx           │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  📥 Baixar modelo de exemplo                                       │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                           [Cancelar]  [Próximo →]  │
└────────────────────────────────────────────────────────────────────┘
```

### 3. Sub-componentes do Dialog

#### `ImportStepUpload.tsx` - Passo 1: Upload
- Área de drag-and-drop para arquivos
- Suporte a CSV (.csv) e Excel (.xls, .xlsx)
- Botão para baixar modelo de exemplo

#### `ImportStepMapping.tsx` - Passo 2: Mapeamento de Colunas
- Detecta colunas do arquivo automaticamente
- Permite mapear colunas do arquivo para campos do sistema
- Preview das primeiras 5 linhas

```text
┌────────────────────────────────────────────────────────────────────┐
│                    Mapear Colunas                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Coluna do Arquivo        →        Campo do Sistema               │
│  ─────────────────────────────────────────────────────            │
│  "Nome Completo"          →  [▼ Nome da Pessoa       ]            │
│  "E-mail"                 →  [▼ Email                ]            │
│  "Telefone"               →  [▼ Telefone             ]            │
│  "Empresa"                →  [▼ Nome da Organização  ]            │
│  "CNPJ da Empresa"        →  [▼ CNPJ                 ]            │
│  "Cargo"                  →  [▼ Cargo                ]            │
│                                                                    │
│  ⓘ Linhas que terão dados de empresa serão vinculadas             │
│     automaticamente ao contato                                     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

#### `ImportStepPreview.tsx` - Passo 3: Preview e Validação
- Mostra dados que serão importados
- Destaca duplicatas detectadas (CPF, CNPJ, Email já existentes)
- Permite desmarcar linhas com erro

```text
┌────────────────────────────────────────────────────────────────────┐
│                    Preview da Importação                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  📊 50 registros encontrados                                       │
│  ✅ 47 válidos   ⚠️ 3 com alertas   ❌ 0 erros                     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ ☑ │ Nome           │ Email              │ Empresa   │ Status │ │
│  ├────────────────────────────────────────────────────────────┤   │
│  │ ✅ │ João Silva     │ joao@email.com     │ ABC Ltda  │ OK     │ │
│  │ ⚠️ │ Maria Santos   │ maria@email.com    │ XYZ SA    │ Email  │ │
│  │    │                │                    │           │ existe │ │
│  │ ✅ │ Pedro Costa    │ pedro@email.com    │ (nova)    │ OK     │ │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ⓘ Registros com alertas serão atualizados (não duplicados)       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

#### `ImportStepProgress.tsx` - Passo 4: Progresso e Resultado
- Barra de progresso durante importação
- Relatório final de sucesso/erros

---

## Campos Suportados para Importação

### Pessoas (Contatos)
| Campo no Sistema | Exemplos de Nome no CSV |
|------------------|-------------------------|
| name | Nome, Nome Completo, Contato |
| cpf | CPF, CPF/CNPF |
| email | Email, E-mail |
| phone | Telefone, Fone |
| whatsapp | WhatsApp, Celular |
| job_title | Cargo, Função |
| notes | Observações, Notas |
| label | Status, Temperatura |
| lead_source | Origem, Origem do Lead |

### Organizações (Empresas)
| Campo no Sistema | Exemplos de Nome no CSV |
|------------------|-------------------------|
| name | Empresa, Razão Social, Organização |
| cnpj | CNPJ, CNPJ da Empresa |
| cnae | CNAE |
| phone | Telefone Empresa |
| email | Email Empresa |
| automotores | Automotores, Qtd Veículos, Frota |
| address_city | Cidade |
| address_state | Estado, UF |
| address_zipcode | CEP |

---

## Lógica de Vinculação Pessoa ↔ Organização

1. **Se a linha contém CNPJ/Nome de empresa**:
   - Verifica se organização já existe (por CNPJ ou nome exato)
   - Se existe: vincula a pessoa a ela
   - Se não existe: cria a organização e vincula

2. **Se pessoa já existe (mesmo email/CPF)**:
   - Opção para atualizar dados existentes
   - Ou pular registro

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/import.ts` | Utilitários de parse e validação |
| `src/components/import/ImportDialog.tsx` | Componente principal do modal |
| `src/components/import/ImportStepUpload.tsx` | Passo 1: Upload de arquivo |
| `src/components/import/ImportStepMapping.tsx` | Passo 2: Mapeamento de colunas |
| `src/components/import/ImportStepPreview.tsx` | Passo 3: Preview e validação |
| `src/components/import/ImportStepProgress.tsx` | Passo 4: Progresso |
| `src/components/import/ImportButton.tsx` | Botão reutilizável para abrir importação |

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/People.tsx` | Adicionar botão de importação ao lado de "Nova Pessoa" |
| `src/pages/Organizations.tsx` | Adicionar botão de importação ao lado de "Nova Organização" |

---

## Modelo de Exemplo para Download

Criar arquivo de exemplo com colunas sugeridas:

```csv
Nome;CPF;Email;Telefone;WhatsApp;Cargo;Empresa;CNPJ;Automotores;Cidade;Estado;Origem
João da Silva;123.456.789-00;joao@email.com;(11) 99999-9999;(11) 99999-9999;Gerente;Transportes ABC;12.345.678/0001-90;25;São Paulo;SP;Indicação
Maria Santos;987.654.321-00;maria@email.com;(21) 88888-8888;(21) 88888-8888;Diretora;Logística XYZ;98.765.432/0001-10;50;Rio de Janeiro;RJ;Google
```

---

## Validações Implementadas

1. **Formato de arquivo**: Apenas CSV, XLS, XLSX
2. **Tamanho máximo**: 5MB
3. **CPF**: Formato válido (se preenchido)
4. **CNPJ**: Formato válido (se preenchido)
5. **Email**: Formato válido (se preenchido)
6. **Nome obrigatório**: Pelo menos nome da pessoa deve estar preenchido
7. **Duplicatas**: Verifica CPF, CNPJ, Email existentes no banco

---

## Tratamento de Erros

| Situação | Comportamento |
|----------|---------------|
| Arquivo inválido | Mensagem de erro clara, volta ao passo 1 |
| Coluna obrigatória não mapeada | Destaque visual, impede avançar |
| Email/CPF duplicado no banco | Marca como "alerta", permite atualizar ou pular |
| Email/CPF duplicado no arquivo | Marca como erro, agrupa registros |
| Erro de inserção no banco | Registra no log, continua com próximos |

---

## Estimativa de Tempo

| Tarefa | Tempo Estimado |
|--------|----------------|
| `src/lib/import.ts` - Utilitários | 2-3h |
| `ImportDialog.tsx` - Estrutura | 1-2h |
| `ImportStepUpload.tsx` - Upload | 1-2h |
| `ImportStepMapping.tsx` - Mapeamento | 2-3h |
| `ImportStepPreview.tsx` - Preview | 2-3h |
| `ImportStepProgress.tsx` - Progresso | 1-2h |
| Integração nas páginas | 1h |
| Testes e ajustes | 2-3h |
| **Total** | **12-18h** |

---

## Fluxo de Dados

```text
Arquivo CSV/Excel
       │
       ▼
┌──────────────┐
│ parseCSV() / │
│ parseExcel() │
└──────────────┘
       │
       ▼
┌──────────────┐
│ Dados brutos │  ← Array de objetos { coluna: valor }
└──────────────┘
       │
       ▼
┌──────────────────┐
│ Mapeamento       │  ← Usuário define qual coluna vai para qual campo
│ de colunas       │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Validação        │  ← Verifica formato, duplicatas
└──────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ Para cada linha:                                      │
│   1. Se tem CNPJ/Empresa → Busca ou cria organização │
│   2. Cria pessoa com organization_id                  │
│   3. Registra resultado (sucesso/erro)               │
└──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────┐
│ Relatório final  │  ← X importados, Y erros, Z atualizados
└──────────────────┘
```

---

## Interface Visual do Botão

O botão de importação será adicionado ao lado do botão "Nova Pessoa" / "Nova Organização":

```text
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [📥 Importar]  [+ Nova Pessoa]                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Dependências

Nenhuma biblioteca externa nova é necessária. Utilizaremos:
- **FileReader API** para leitura de arquivos
- **Componentes shadcn/ui existentes** (Dialog, Button, Progress, etc.)
- **React Query** para mutações

---

## Atualização do plan.md

Após implementação, adicionar nova seção:

```markdown
### SPRINT 5: Importação de Dados ✅ CONCLUÍDO

#### 5.1 Importação via CSV/Excel ✅
- Modal multi-passos para importação
- Suporte a CSV (UTF-8, separador automático) e Excel
- Mapeamento de colunas configurável
- Validação de duplicatas (CPF, CNPJ, Email)
- Vinculação automática Pessoa ↔ Organização
- Relatório de resultado da importação

**Arquivos criados:**
- `src/lib/import.ts`
- `src/components/import/ImportDialog.tsx`
- `src/components/import/ImportStepUpload.tsx`
- `src/components/import/ImportStepMapping.tsx`
- `src/components/import/ImportStepPreview.tsx`
- `src/components/import/ImportStepProgress.tsx`
- `src/components/import/ImportButton.tsx`

**Arquivos modificados:**
- `src/pages/People.tsx`
- `src/pages/Organizations.tsx`
```
