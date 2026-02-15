

# Inserir Assinatura do Usuario e Melhorar Visibilidade no Compositor

## Problema
A tabela `user_signatures` esta vazia -- o usuario nunca salvou uma assinatura. Por isso, o preview de assinatura no `EmailComposerDialog` nao aparece e o email e enviado sem assinatura.

## Alteracoes

### 1. Inserir a assinatura no banco de dados
Usar a ferramenta de insert para salvar a assinatura HTML do usuario na tabela `user_signatures`. A assinatura contera:

- Nome: Adriano Jacometo
- Cargo: Corretor de Seguros
- Empresa: Jacometo Corretora de Seguros
- WhatsApp: +55 43 9 9914-5000
- Telefone: (43) 3321-5007
- Endereco: Rua Souza Naves, 612 - Sala 51 - Centro - Londrina/PR
- Site: jacometoseguros.com.br

O HTML sera formatado profissionalmente com links clicaveis para WhatsApp e site.

### 2. Nenhuma alteracao de codigo necessaria
O sistema ja esta preparado:
- O `EmailComposerDialog` ja exibe o preview da assinatura quando ela existe
- O `handleSend` ja anexa `signature.signature_html` ao corpo do email antes de enviar
- O hook `useUserSignature` ja busca a assinatura ativa do usuario

Basta inserir o dado no banco para tudo funcionar automaticamente.

## Detalhes Tecnicos

### SQL de insert
Inserir na tabela `user_signatures` com:
- `user_id`: ID do usuario autenticado atual
- `signature_html`: HTML formatado da assinatura
- `is_active`: true

### Arquivo nenhum modificado
Apenas operacao de dados no banco.

