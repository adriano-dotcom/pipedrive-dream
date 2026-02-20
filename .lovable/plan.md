
# Remover botao "Criar primeiro negocio" do Kanban

## O que sera feito

Remover o botao "+ Criar primeiro negocio" que aparece no estado vazio do pipeline (quando nao ha negocios). A mensagem informativa "Nenhum negocio neste pipeline" sera mantida, apenas o botao de acao sera removido.

## Arquivo modificado

- `src/components/deals/KanbanBoard.tsx` - remover o botao `<button>` com texto "Criar primeiro negocio" do estado vazio do Kanban board

## Resultado

Quando o pipeline estiver vazio, o usuario vera apenas o icone e a mensagem informativa, sem o botao de criar negocio diretamente ali.
