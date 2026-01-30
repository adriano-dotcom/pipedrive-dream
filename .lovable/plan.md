

# Feedback Aprimorado ao Criar Pessoa

## Objetivo

Melhorar a experiencia do usuario ao criar/editar pessoas com:
1. Validacao server-side reforçada (nao confiar apenas no frontend)
2. Feedback visual mais claro em todos os estados
3. Estados do botao bem definidos

---

## Situacao Atual

O codigo ja possui:
- Validacao server-side no `createMutation.mutationFn` (linhas 155-179) que verifica duplicatas antes do insert
- Toast de sucesso "Pessoa criada com sucesso!"
- Toast de erro com mensagens especificas para email/WhatsApp/CPF duplicados

O que precisa melhorar:
- Mensagens de erro mais claras com icones
- Estado visual do botao durante erro
- Possibilidade de adicionar validacao via database constraint (mais robusta)

---

## Modificacoes

### 1. PersonForm.tsx - Melhorar Toasts de Erro

**Atualizar `onError` no createMutation (linhas 206-222):**

```typescript
onError: (error) => {
  if (error.message.includes('email')) {
    setEmailError('Este e-mail ja esta cadastrado no sistema');
    toast.error('E-mail ja cadastrado', {
      description: 'Ja existe uma pessoa cadastrada com este email.',
      icon: '⚠️',
    });
  } else if (error.message.includes('WhatsApp')) {
    setWhatsappError('Este WhatsApp ja esta cadastrado no sistema');
    toast.error('WhatsApp ja cadastrado', {
      description: 'Ja existe uma pessoa cadastrada com este WhatsApp.',
      icon: '⚠️',
    });
  } else if (error.message.includes('CPF')) {
    toast.error('CPF ja cadastrado', {
      description: 'Ja existe uma pessoa cadastrada com este CPF.',
      icon: '⚠️',
    });
  } else {
    toast.error('Erro ao criar pessoa', {
      description: error.message,
      icon: '❌',
    });
  }
},
```

**Atualizar `onSuccess` (linhas 200-205):**

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['people'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  toast.success('Pessoa criada com sucesso!', {
    description: 'O contato foi adicionado ao sistema.',
    icon: '✅',
  });
  onSuccess();
},
```

### 2. PersonForm.tsx - Estado do Botao Melhorado

**Atualizar o botao de submit (linhas 518-521):**

```tsx
<Button 
  type="submit" 
  disabled={isLoading || !!emailError || !!whatsappError}
  className={cn(
    emailError || whatsappError ? 'animate-shake' : ''
  )}
>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {person ? 'Salvando...' : 'Criando...'}
    </>
  ) : (
    person ? 'Salvar Alteracoes' : 'Criar Pessoa'
  )}
</Button>
```

### 3. AddContactPersonDialog.tsx - Validacao Server-side

**Adicionar validacao antes do insert no createMutation (linha 183):**

```typescript
const createMutation = useMutation({
  mutationFn: async () => {
    // Validacao server-side - verificar duplicatas novamente
    if (newPersonEmail) {
      const exists = await checkEmailExists(newPersonEmail);
      if (exists) {
        throw new Error('email_duplicado');
      }
    }
    
    if (newPersonWhatsapp) {
      const exists = await checkWhatsappExists(newPersonWhatsapp);
      if (exists) {
        throw new Error('whatsapp_duplicado');
      }
    }

    const { data, error } = await supabase
      .from('people')
      .insert({
        name: newPersonName.trim(),
        job_title: newPersonJobTitle.trim() || null,
        phone: newPersonPhone.trim() || null,
        email: newPersonEmail.trim().toLowerCase() || null,
        whatsapp: newPersonWhatsapp.trim() || null,
        organization_id: organizationId || null,
        owner_id: user?.id,
        created_by: user?.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as Person;
  },
  onSuccess: (person) => {
    queryClient.invalidateQueries({ queryKey: ['organization-contacts'] });
    queryClient.invalidateQueries({ queryKey: ['people'] });
    onPersonCreated(person);
    toast.success('Pessoa criada com sucesso!', {
      description: 'O contato foi adicionado ao sistema.',
      icon: '✅',
    });
    onOpenChange(false);
    resetForm();
  },
  onError: (error) => {
    if (error.message === 'email_duplicado') {
      setEmailError('Este e-mail ja esta cadastrado no sistema');
      toast.error('E-mail ja cadastrado', {
        description: 'Use outro e-mail ou busque a pessoa existente.',
        icon: '⚠️',
      });
    } else if (error.message === 'whatsapp_duplicado') {
      setWhatsappError('Este WhatsApp ja esta cadastrado no sistema');
      toast.error('WhatsApp ja cadastrado', {
        description: 'Use outro numero ou busque a pessoa existente.',
        icon: '⚠️',
      });
    } else {
      toast.error('Erro ao criar pessoa', {
        description: error.message,
        icon: '❌',
      });
    }
  },
});
```

### 4. PersonForm.tsx - Atualizar updateMutation tambem

**Aplicar mesmo padrao no updateMutation (linhas 262-283):**

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['people'] });
  toast.success('Pessoa atualizada com sucesso!', {
    description: 'As alteracoes foram salvas.',
    icon: '✅',
  });
  onSuccess();
},
onError: (error) => {
  if (error.message.includes('email')) {
    setEmailError('Este e-mail ja esta cadastrado no sistema');
    toast.error('E-mail ja cadastrado', {
      description: 'Ja existe outra pessoa cadastrada com este email.',
      icon: '⚠️',
    });
  } else if (error.message.includes('WhatsApp')) {
    setWhatsappError('Este WhatsApp ja esta cadastrado no sistema');
    toast.error('WhatsApp ja cadastrado', {
      description: 'Ja existe outra pessoa cadastrada com este WhatsApp.',
      icon: '⚠️',
    });
  } else if (error.message.includes('CPF')) {
    toast.error('CPF ja cadastrado', {
      description: 'Ja existe outra pessoa cadastrada com este CPF.',
      icon: '⚠️',
    });
  } else {
    toast.error('Erro ao atualizar pessoa', {
      description: error.message,
      icon: '❌',
    });
  }
},
```

---

## Fluxo Visual dos Estados

```text
Usuario clica "Criar Pessoa"
       |
       v
Botao muda para "Criando..." + loading
       |
       v
Validacao server-side (duplicatas)
       |
   Duplicado?
   /       \
 Sim       Nao
  |         |
  v         v
Toast     Insert no banco
erro        |
⚠️         Sucesso?
  |       /       \
  v     Sim       Nao
Campo    |         |
fica     v         v
vermelho Toast   Toast
        ✅        ❌
         |
         v
    onSuccess()
   (fecha dialog/redireciona)
```

---

## Resumo de Arquivos

| Arquivo | Modificacao |
|---------|-------------|
| PersonForm.tsx | Melhorar toasts, adicionar estados visuais ao botao, sincronizar erros inline |
| AddContactPersonDialog.tsx | Adicionar validacao server-side duplicada, melhorar toasts de feedback |

---

## Beneficios

1. **Seguranca**: Validacao dupla (frontend + backend) previne race conditions
2. **UX**: Feedback visual claro em todos os estados
3. **Consistencia**: Mesmo padrao em todos os forms de criacao de pessoa
4. **Acessibilidade**: Icones + texto nos toasts facilitam compreensao

