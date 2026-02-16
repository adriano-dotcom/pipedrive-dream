

# Criar Campanhas como Rascunho e Enviar Depois

## Problema Atual
Hoje, ao selecionar contatos e clicar em "E-mail em Massa", o usuario e obrigado a compor e enviar o email imediatamente. Nao existe a opcao de salvar os destinatarios em uma campanha e voltar depois para escrever e enviar o email.

## Novo Fluxo Proposto

```text
Fluxo 1 - Criar campanha primeiro, enviar depois:
1. Selecionar contatos (via checkbox ou filtros)
2. Clicar em "Adicionar a Campanha" -> salva como rascunho
3. Ir em "Campanhas" -> ver campanha com status "Rascunho"
4. Clicar em "Enviar" -> abre compositor com os destinatarios da campanha
5. Escrever email e disparar

Fluxo 2 - Enviar imediatamente (mantido):
1. Selecionar contatos
2. Clicar em "E-mail em Massa" -> compor e enviar na hora
```

## Alteracoes

### 1. `src/hooks/useBulkEmail.ts`
- Adicionar uma nova mutation `saveDraftCampaign` que cria a campanha com status `draft` e insere os recipients, mas NAO dispara o `process-bulk-email`
- Adicionar uma nova mutation `sendCampaign` que recebe `campaign_id`, `subject`, `body` e `rateLimit`, atualiza a campanha com esses dados, muda status para `queued` e dispara o processamento

### 2. `src/pages/People.tsx`
- Adicionar botao "Adicionar a Campanha" na toolbar (ao lado do "E-mail em Massa")
- Ao clicar, abrir um dialog simples pedindo apenas o nome/titulo da campanha
- Salvar como rascunho e mostrar toast de confirmacao

### 3. `src/components/people/PeopleTable.tsx`
- Adicionar novo botao "Salvar em Campanha" na toolbar de selecao em lote
- Adicionar callback `onSaveToCampaign`

### 4. `src/components/email/BulkEmailCampaignsList.tsx`
- Para campanhas com status `draft`, mostrar botao "Enviar E-mail" (ao inves de so "Detalhes")
- O botao abre o compositor pre-carregado com os destinatarios da campanha
- Adicionar botao de excluir para campanhas em rascunho

### 5. `src/components/email/CampaignComposerDialog.tsx` (NOVO)
- Novo componente: compositor de email para campanhas existentes
- Recebe o `campaignId`, carrega os recipients da campanha
- Ao enviar, atualiza subject/body na campanha e dispara o processamento
- Reutiliza a mesma UI do `BulkEmailComposerDialog` (templates, variaveis, IA, assinatura)

### 6. `src/components/email/SaveToCampaignDialog.tsx` (NOVO)
- Dialog simples com campo de texto para o nome/titulo da campanha
- Botao "Salvar" que cria a campanha como rascunho

## Secao Tecnica

### Nova mutation em `useBulkEmail.ts` - saveDraftCampaign:
```typescript
interface SaveDraftParams {
  name: string;  // titulo da campanha
  recipients: { person_id: string; email: string; name: string; ... }[];
}

// Cria campanha com status 'draft', SEM disparar process-bulk-email
const saveDraftMutation = useMutation({
  mutationFn: async (params: SaveDraftParams) => {
    // Insert campaign com status: 'draft', subject: params.name, body: ''
    // Insert recipients com status: 'pending'
    // NAO chama process-bulk-email
  },
});
```

### Nova mutation em `useBulkEmail.ts` - sendCampaign:
```typescript
interface SendCampaignParams {
  campaignId: string;
  subject: string;
  body: string;
  rateLimit: number;
}

// Atualiza campaign com subject/body, muda status -> queued, dispara processamento
const sendCampaignMutation = useMutation({
  mutationFn: async (params: SendCampaignParams) => {
    // Update campaign com subject, body, rate_limit, status: 'queued'
    // Chama process-bulk-email
  },
});
```

### Fluxo na CampaignsList para campanhas draft:
```typescript
{campaign.status === 'draft' && (
  <>
    <Button onClick={() => setComposingCampaignId(campaign.id)}>
      <Send /> Enviar E-mail
    </Button>
    <Button variant="destructive" onClick={() => deleteCampaign(campaign.id)}>
      <Trash2 /> Excluir
    </Button>
  </>
)}
```

### Arquivos modificados:
- `src/hooks/useBulkEmail.ts` - novas mutations (saveDraft, sendCampaign, deleteCampaign)
- `src/pages/People.tsx` - novo botao + dialog de salvar em campanha
- `src/components/people/PeopleTable.tsx` - novo botao na toolbar
- `src/components/email/BulkEmailCampaignsList.tsx` - acoes para campanhas draft

### Arquivos novos:
- `src/components/email/SaveToCampaignDialog.tsx` - dialog de nome da campanha
- `src/components/email/CampaignComposerDialog.tsx` - compositor para campanhas existentes

### Nenhuma migracao SQL necessaria
A tabela `bulk_email_campaigns` ja tem o status `draft` e todos os campos necessarios (subject, body, rate_limit). A tabela `bulk_email_recipients` ja suporta os dados dos destinatarios.
