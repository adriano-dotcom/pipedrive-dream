

# Corrigir Importacao - Registros Faltantes (6437 vs 4291)

## Diagnostico

O arquivo CSV continha 6437 registros, mas apenas 4291 organizacoes foram criadas. A causa raiz e que o processo de importacao realiza cada linha de forma sequencial com 3-6 chamadas individuais ao banco por linha, totalizando ~25.000 chamadas. Isso causa:

- Timeout do navegador ou travamento da aba
- Exaustao de memoria
- O processo para sem aviso e sem possibilidade de retomar

## Solucao em Duas Partes

### Parte 1: Reimportar os registros faltantes

Antes de alterar o codigo, o usuario deve reimportar o mesmo arquivo CSV. O sistema de deteccao de duplicatas (pipedrive_id, CNPJ, nome) ira pular os 4291 ja existentes e importar apenas os ~2146 faltantes. Porem, para isso funcionar, precisamos primeiro corrigir o codigo.

### Parte 2: Implementar processamento em lote (batch)

#### Arquivo: `src/components/import/ImportDialog.tsx`

**Alteracao 1 - Pre-fetch sem limite de 1000 linhas (linhas 69-88)**

Adicionar paginacao ao carregar registros existentes para garantir que TODOS os registros sejam buscados, nao apenas os primeiros 1000:

```text
// Buscar TODOS os registros existentes usando paginacao
queryFn: async () => {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, cnpj, pipedrive_id')
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
};
```

Aplicar o mesmo padrao para a query de `people`.

**Alteracao 2 - Processamento em lotes com intervalo (funcao `performImport`)**

Modificar o loop principal (linha 275) para processar em lotes de 50 registros com pausa entre lotes:

```text
const BATCH_SIZE = 50;
for (let i = 0; i < selectedRows.length; i++) {
  // ... logica existente de processamento por linha ...

  // A cada BATCH_SIZE registros, pausar para evitar sobrecarga
  if ((i + 1) % BATCH_SIZE === 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

Isso permite que o navegador processe eventos da interface (atualizacao da barra de progresso, prevencao de travamento).

**Alteracao 3 - Tratamento de erro resiliente por linha**

O bloco catch (linha 569) ja existe, mas adicionar log mais detalhado e continuar processando mesmo apos erros:

```text
catch (error) {
  console.error(`[Import] Erro na linha ${row.index + 2}:`, error);
  results.push({
    success: false,
    name: row.mappedData.name || row.mappedData.org_name || `Linha ${row.index + 2}`,
    type: 'person',
    error: error instanceof Error ? error.message : 'Erro desconhecido',
  });
}
```

### Resumo das alteracoes

| Arquivo | Alteracao |
|---|---|
| `src/components/import/ImportDialog.tsx` | Paginacao no pre-fetch de duplicatas (evitar limite de 1000) |
| `src/components/import/ImportDialog.tsx` | Pausa entre lotes de 50 registros (evitar travamento) |
| `src/components/import/ImportDialog.tsx` | Logging melhorado nos erros |

### Fluxo apos a correcao

1. Aplicar as alteracoes no codigo
2. Reimportar o mesmo arquivo CSV
3. O sistema detectara os 4291 registros existentes como duplicatas (atualizara dados se necessario)
4. Os ~2146 registros faltantes serao criados normalmente
5. A barra de progresso funcionara sem travamento

