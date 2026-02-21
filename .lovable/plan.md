
# Confirmacao de Email no Cadastro

## O que sera feito

Garantir que tanto o cadastro manual quanto o cadastro via Google exijam confirmacao de email antes de permitir o primeiro login. Apos o cadastro, o vendedor vera uma tela clara pedindo para verificar o email. Ao clicar no link do email, ele sera redirecionado ao sistema e podera fazer login.

## Como vai funcionar

1. **Cadastro manual**: Ao criar conta, o sistema envia email de confirmacao automaticamente (comportamento padrao do sistema de autenticacao). O usuario ve uma tela bonita de "Verifique seu email" em vez de apenas um toast.
2. **Cadastro via Google**: Restringir ao dominio `@jacometo` usando o parametro `hd` do Google OAuth. Como o Google ja verifica o email, nao precisa de confirmacao adicional - o login e imediato.
3. **Protecao**: Usuarios com email nao confirmado (cadastro manual) sao bloqueados de acessar o sistema ate confirmar.

## Etapas tecnicas

### 1. Pagina Auth (`src/pages/Auth.tsx`)
- Adicionar estado `showEmailSent` que exibe uma tela de confirmacao apos signup bem-sucedido
- A tela mostra icone de email, mensagem "Verifique seu email", o endereco usado, e botao para voltar ao login
- Restringir Google OAuth ao dominio `@jacometo` adicionando `extraParams: { hd: "jacometo.com.br" }`

### 2. ProtectedRoute (`src/components/layout/ProtectedRoute.tsx`)
- Adicionar verificacao de `user.email_confirmed_at`
- Se o usuario existe mas email nao esta confirmado, redirecionar para `/auth` com mensagem
- Isso impede acesso ao sistema antes da confirmacao

### 3. AuthContext (`src/contexts/AuthContext.tsx`)
- Verificar `email_confirmed_at` no usuario antes de considerar como autenticado
- Usuarios via Google OAuth ja vem com email confirmado, entao passam direto

### Arquivos modificados
- `src/pages/Auth.tsx` - tela pos-cadastro + restricao Google domain
- `src/components/layout/ProtectedRoute.tsx` - bloquear emails nao confirmados
- `src/contexts/AuthContext.tsx` - verificar confirmacao de email

### Seguranca
- Emails nao confirmados nao conseguem acessar nenhuma rota protegida
- Google OAuth restrito ao dominio @jacometo via parametro `hd`
- Cadastro manual ja restrito a @jacometo pela validacao Zod existente
