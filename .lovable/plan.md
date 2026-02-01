
## Objetivo
Fazer os cliques em **Organizações** (e também Pessoas) funcionarem de forma consistente, removendo a causa real que está “travando” a navegação/renderização.

## O que encontrei (investigação a fundo)
Nos logs do navegador apareceu repetidamente:

- **“Warning: Maximum update depth exceeded”**
- Stack trace apontando para **`DealFormSheet.tsx`** (componente de formulário de Negócio), renderizado dentro de páginas de detalhes (ex.: `PersonDetails`, e também `OrganizationDetails`).

Isso é um sintoma de **loop infinito de re-render** (setState disparando toda renderização).  
Quando você clica num link da tabela, o URL pode até mudar, mas a página de destino entra nesse loop e “não abre” (parece que o clique não funcionou).

### Causa raiz provável (bem específica)
Em `src/components/deals/DealFormSheet.tsx` há um `useEffect` que sincroniza tags:

- Quando **`deal` é null** (novo negócio) ele faz `setSelectedTagIds([])`.
- Esse `useEffect` roda por depender de `existingTagAssignments`, que pode mudar por referência (mesmo que continue “vazio”), e como `setSelectedTagIds([])` cria **um novo array** sempre, isso dispara re-render, que dispara o effect de novo, entrando no loop.

Isso casa exatamente com o erro de “Maximum update depth exceeded”.

## Correção proposta (sem mudar UX)
### 1) Tornar a sincronização de tags “idempotente” (não atualizar estado se não precisar)
No `DealFormSheet.tsx`, ajustar o `useEffect` para:
- Rodar **somente quando o Sheet estiver aberto (`open === true`)**  
  (se o sheet está fechado, não faz sentido sincronizar estado interno e evita loop em páginas de detalhes)
- Antes de chamar `setSelectedTagIds(...)`, comparar o “estado atual” vs “novo estado” e **só setar se mudou**  
  (ex.: comparar com `join(',')` após ordenar, ou um helper `areArraysEqual`)

### 2) Garantir que “novo negócio” (deal null) não dispara setState repetidamente
Quando `deal` é null, em vez de sempre fazer `setSelectedTagIds([])`:
- Só fazer isso quando:
  - o Sheet abrir, ou
  - o `deal?.id` mudar (ex.: de um id para null)

## Por que isso resolve o clique em Organizações/Pessoas
- Ao navegar para `/organizations/:id` (ou `/people/:id`), a página deixa de entrar no loop infinito.
- Sem loop, o React consegue montar a tela de detalhes normalmente, então o clique “funciona”.

## Arquivos a alterar
- `src/components/deals/DealFormSheet.tsx`
  - Ajustar o `useEffect` de sincronização de tags para não causar loop (condicionar por `open` + comparar antes de setar).

## Checklist de teste (end-to-end)
1) Em **/organizations**:
   - clicar em 5 empresas diferentes e confirmar que abre **/organizations/:id** corretamente
2) Em **/people**:
   - clicar em 5 pessoas diferentes e confirmar que abre **/people/:id**
3) Abrir “Novo Negócio” (DealFormSheet) a partir de OrganizationDetails e PersonDetails:
   - confirmar que o modal abre sem travar
4) Se existir edição de negócio:
   - abrir edição e confirmar que tags pré-existentes carregam sem loop
5) Abrir/fechar o DealFormSheet várias vezes e confirmar que não aparece mais o warning no console

## Observação adicional (para estabilidade futura)
Depois dessa correção, se ainda houver problema de clique “intermitente”, o próximo passo é capturar o erro exato no console no momento do clique (mas o log atual já aponta um culpado forte e consistente).
