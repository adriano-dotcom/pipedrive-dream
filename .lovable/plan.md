
# Editar, Excluir e Reordenar Funis de Vendas

## O que sera feito

### 1. Adicionar botao de Excluir funil no PipelineSelector
- Adicionar icone de lixeira (Trash2) ao lado do botao de editar no dropdown do seletor de funil
- Ao clicar, abre um dialogo de confirmacao antes de excluir
- Se o funil tiver negocios vinculados, exibir aviso informando quantos negocios serao afetados e impedir a exclusao
- Nao permitir excluir o ultimo funil restante

### 2. Adicionar opcao de Excluir no formulario de edicao (PipelineFormSheet)
- Adicionar botao "Excluir Funil" no rodape do formulario quando estiver editando um funil existente
- Reutilizar a mesma logica de confirmacao e validacao

### 3. Drag-and-drop para reordenar funis
- Adicionar coluna `position` na tabela `pipelines` via migracao SQL (integer, default 0)
- Atualizar a query de pipelines para ordenar por `position` ao inves de `name`
- Adicionar suporte a drag-and-drop no dropdown do PipelineSelector usando @hello-pangea/dnd (ja instalado no projeto)
- Ao soltar, atualizar as posicoes no banco de dados

## Detalhes tecnicos

### Migracao SQL
- Adicionar coluna `position` (integer, default 0) na tabela `pipelines`
- Atualizar posicoes iniciais dos pipelines existentes baseado na ordem atual

### PipelineSelector.tsx
- Importar `Trash2` do lucide-react e `@hello-pangea/dnd` para drag-and-drop
- Adicionar botao de excluir com tooltip ao lado do botao de editar
- Adicionar `onDelete` callback nas props
- Envolver lista de pipelines com `DragDropContext` e `Droppable`/`Draggable`
- Adicionar icone de grip (GripVertical) para indicar que e arrastavel
- Adicionar `onReorder` callback nas props

### PipelineFormSheet.tsx
- Adicionar botao "Excluir Funil" quando `pipeline` prop existir
- Incluir `DeleteConfirmDialog` para confirmacao

### Deals.tsx
- Adicionar handler `handleDeletePipeline` com mutation para excluir pipeline e seus stages
- Adicionar handler `handleReorderPipelines` com mutation para atualizar posicoes
- Verificar se pipeline tem negocios antes de permitir exclusao
- Apos excluir, selecionar o primeiro pipeline restante
- Passar novos callbacks para DealsHeader e PipelineSelector

### DealsHeader.tsx
- Adicionar props `onDeletePipeline` e `onReorderPipelines` e passa-los ao PipelineSelector
