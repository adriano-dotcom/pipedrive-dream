
# Analise Completa: UX e Seguranca do Banco de Dados

## Resumo Executivo

O CRM Jacometo e um sistema bem construido com uma base solida de UX e seguranca. Porem, existem areas criticas que precisam de atencao, especialmente em politicas de acesso ao banco de dados e alguns ajustes de experiencia do usuario.

---

## PARTE 1: Analise de Seguranca do Banco de Dados

### Problemas Criticos (error)

| Problema | Tabela | Risco |
|----------|--------|-------|
| Dados pessoais de clientes acessiveis a todos | `people` | CPF, email, telefone, WhatsApp expostos a qualquer usuario autenticado |
| Dados empresariais expostos | `organizations` | CNPJ, financeiro, enderecos acessiveis a todos |
| Perfis de usuarios expostos | `profiles` | Nomes, telefones, avatares visiveis para todos |
| Documentos de socios expostos | `organization_partners` | CPF/CNPJ de socios acessiveis a todos |
| Mensagens WhatsApp expostas | `whatsapp_messages` | Conversas privadas legiveis por qualquer funcionario |

**Contexto importante**: O sistema foi projetado com o modelo "Acesso Total para Equipe" (conforme memoria do projeto). Isso significa que essas politicas de SELECT abertas sao **intencionais** para permitir colaboracao entre corretores e admins. Nao sao falhas, mas sim decisoes de arquitetura.

### Problemas de Nivel Medio (warn)

| Problema | Detalhes |
|----------|----------|
| Extensao no schema public | pg_trgm instalada no schema public em vez de um schema dedicado |
| Politica RLS sempre true | Politica INSERT em `notifications` usa `WITH CHECK (true)` - necessario para o service role inserir notificacoes |
| Dados financeiros de deals visiveis | Valores, comissoes e detalhes de apolices visiveis para todos |
| Listas de email marketing | Destinatarios de campanhas podem ser exportados pelo criador |
| Atividades visiveis globalmente | Tarefas e reunioes de todos os usuarios sao visiveis |
| Conversas WhatsApp visiveis | Metadados de conversas acessiveis a todos |

### Problemas de Nivel Informativo (info)

| Problema | Status |
|----------|--------|
| Roles de usuarios visiveis | Intencional para transparencia da equipe |
| Estrutura de pipelines visivel | Intencional para coordenacao de vendas |

### Recomendacao de Seguranca

Como o sistema segue o modelo de "Acesso Total para Equipe", as politicas atuais estao **alinhadas com a decisao de projeto**. Se no futuro for necessario isolar dados por corretor, sera preciso:

1. Alterar todas as politicas SELECT para filtrar por `owner_id = auth.uid()`
2. Criar uma funcao de visibilidade que permita admins verem tudo
3. Ajustar o frontend para lidar com dados restritos

---

## PARTE 2: Analise de UX

### Pontos Positivos (ja implementados)

1. **Design consistente**: Interface iOS-like com glass morphism, bem executada
2. **Busca global**: Ctrl+K com filtros por categoria, itens recentes, highlight de matches
3. **Responsividade**: Layout adaptativo com sidebar colapsavel, drawer mobile, tab bar iOS
4. **Validacao de formularios**: Zod schemas com validacao inline (CNPJ, CPF, email)
5. **Auto-preenchimento**: CNPJ busca dados automaticamente da BrasilAPI
6. **Error boundary**: Componente de captura de erros com botao de retry
7. **Unhandled rejection handler**: Tratamento global de erros assincronos
8. **Tema escuro/claro**: Toggle acessivel na sidebar e drawer mobile
9. **Skeleton loading**: Estados de carregamento em cards do dashboard
10. **Toast notifications**: Feedback visual em todas as operacoes CRUD

### Problemas de UX Identificados

#### 1. Falta de "Esqueci minha senha" na tela de login
A pagina de autenticacao nao oferece opcao de recuperacao de senha. Usuarios que esquecerem a senha ficam sem opcao.

#### 2. Sem confirmacao de email apos cadastro
Apos o signup, o usuario e redirecionado diretamente sem feedback claro sobre verificacao de email. O toast diz "Conta criada com sucesso!" mas nao menciona verificacao.

#### 3. Menu mobile incompleto
O `MobileDrawer` nao inclui "Relatorios", "Timelines.ai" e "Vendedores" (para admins), enquanto a sidebar desktop inclui. Usuarios mobile perdem acesso a essas funcionalidades.

#### 4. Pagina Settings sem validacao
O formulario de perfil em Settings nao tem validacao (nome pode ficar vazio, telefone sem formato). Comparar com os formularios de Organizacao que usam Zod.

#### 5. Falta de paginacao explicita nas listagens
As queries usam `.limit()` em alguns lugares mas podem atingir o limite de 1000 linhas do banco sem feedback ao usuario.

#### 6. QueryClient sem configuracao de retry/staleTime
O `QueryClient` e criado sem configuracoes personalizadas, usando defaults do React Query que podem causar requisicoes excessivas.

#### 7. Navegacao de breadcrumbs
Existe um componente `PageBreadcrumbs.tsx` mas nao e usado no layout principal, dificultando a orientacao do usuario em paginas de detalhe.

---

## PARTE 3: Plano de Implementacao

### Fase 1 - Correcoes Criticas de UX

**1. Adicionar "Esqueci minha senha" na pagina Auth**
- Adicionar link/botao abaixo do formulario de login
- Implementar chamada `supabase.auth.resetPasswordForEmail()`
- Criar tela/dialog de redefinicao de senha

**2. Completar menu mobile**
- Adicionar "Relatorios" ao `MobileDrawer`
- Adicionar links admin (Timelines.ai, Vendedores) condicionalmente como na sidebar

**3. Validacao no formulario de Settings**
- Adicionar Zod schema para nome (min 2 chars) e telefone
- Prevenir envio de dados vazios

### Fase 2 - Melhorias de UX

**4. Configuracao otimizada do QueryClient**
- Adicionar `staleTime`, `retry`, e `refetchOnWindowFocus` adequados

**5. Feedback claro de signup**
- Informar que email de verificacao foi enviado (se auto-confirm estiver desativado)

### Fase 3 - Seguranca do Banco

**6. Marcar findings de seguranca como intencionais**
- Atualizar o scan de seguranca para refletir que o modelo "Acesso Total para Equipe" e intencional
- Documentar a decisao de arquitetura nos findings

**7. Resolver warnings do linter**
- Avaliar mover extensao pg_trgm para schema dedicado
- Revisar politica `WITH CHECK (true)` em notifications

---

## Secao Tecnica

### Arquivos que serao modificados:

```text
src/pages/Auth.tsx              -> Adicionar recuperacao de senha
src/components/layout/MobileDrawer.tsx -> Completar menu mobile
src/pages/Settings.tsx          -> Adicionar validacao Zod
src/App.tsx                     -> Configurar QueryClient
```

### Migracao SQL necessaria:
Nenhuma migracao de banco e necessaria. Todas as mudancas sao no frontend.

### Estimativa de complexidade:
- Fase 1: Baixa (3 arquivos, mudancas localizadas)
- Fase 2: Baixa (2 arquivos)
- Fase 3: Administrativa (atualizacao de scan findings)
