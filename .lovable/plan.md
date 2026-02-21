

# Corrigir Envio de Email de Confirmacao no Cadastro

## Problema Identificado

O sistema de autenticacao esta configurado com **auto-confirm ativado**, o que faz com que os usuarios sejam confirmados automaticamente no momento do cadastro, **sem receber nenhum email de verificacao**. Por isso o jarvis nao recebeu o email.

O usuario jarvis ja esta com status confirmado no sistema (email_confirmed_at preenchido), entao ele ja consegue fazer login normalmente.

## O que sera feito

1. **Desabilitar auto-confirm** nas configuracoes de autenticacao usando a ferramenta de configuracao do backend. Isso fara com que novos cadastros recebam um email de confirmacao automaticamente.

2. **Sobre o jarvis**: Como ele ja foi auto-confirmado, ele ja pode fazer login sem problemas. Nao precisa de nenhuma acao adicional para ele.

## Detalhes tecnicos

- Usar a ferramenta `configure-auth` para desabilitar `autoconfirm` no Supabase Auth
- Apos essa mudanca, novos cadastros manuais (email/senha) vao receber o email de confirmacao automaticamente do sistema de autenticacao
- A tela "Verifique seu email" que ja foi implementada na pagina de Auth vai funcionar corretamente
- Cadastros via Google OAuth continuam funcionando normalmente (Google ja verifica o email)

## Resultado esperado

- Novos vendedores que se cadastrarem via email/senha vao receber o email de confirmacao
- Somente apos clicar no link do email, eles poderao fazer o primeiro login
- O jarvis ja esta confirmado e pode acessar o sistema normalmente

