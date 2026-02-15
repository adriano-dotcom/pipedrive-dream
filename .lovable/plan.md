
# Adicionar Editor de Assinatura de Email nas Configuracoes

## Contexto
A tabela `user_signatures` e o hook `useUserSignature` ja existem. O `EmailComposerDialog` ja anexa a assinatura automaticamente ao enviar. O que falta e a **interface para o usuario criar e editar sua assinatura** na pagina de Configuracoes.

## Alteracoes

### 1. Modificar `src/pages/Settings.tsx`
- Importar `useUserSignature` e o `RichTextEditor`
- Adicionar um novo Card "Assinatura de Email" abaixo do card de Permissoes
- O card tera:
  - Um `RichTextEditor` para editar a assinatura em HTML (com formatacao rica: negrito, links, etc.)
  - Um botao "Salvar Assinatura" que chama `saveSignature()`
  - Preview da assinatura atual quando salva
- Inicializar o editor com o valor da assinatura existente (se houver)

### Fluxo
1. Usuario acessa Configuracoes
2. Ve o card "Assinatura de Email" com o editor rich text
3. Digita/cola sua assinatura (nome, cargo, telefone, site, etc.)
4. Clica "Salvar Assinatura"
5. A assinatura e salva no banco e automaticamente usada em todos os emails enviados

### Detalhes Tecnicos
- Reutiliza o componente `RichTextEditor` ja existente (TipTap)
- Reutiliza o hook `useUserSignature` que ja tem `saveSignature` e `isSaving`
- Nenhuma alteracao de banco de dados necessaria (tabela ja existe)
- Nenhum arquivo novo, apenas modificacao do `Settings.tsx`
