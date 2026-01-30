

# Validacao de Email Duplicado em Tempo Real (onBlur)

## Objetivo

Implementar validacao inline do campo de email quando o usuario sai do campo, verificando se o email ja existe no banco de dados e mostrando erro visual antes do submit.

---

## Componentes Afetados

### 1. PersonForm.tsx (formulario principal)

### 2. AddContactPersonDialog.tsx (dialog de criacao rapida)

---

## Modificacoes Detalhadas

### PersonForm.tsx

**Estado adicional:**

```typescript
const [emailError, setEmailError] = useState<string | null>(null);
const [isCheckingEmail, setIsCheckingEmail] = useState(false);
```

**Handler onBlur para email:**

```typescript
const handleEmailBlur = async () => {
  const email = watch('email');
  if (!email || email.trim() === '') {
    setEmailError(null);
    return;
  }
  
  setIsCheckingEmail(true);
  try {
    const exists = await checkEmailExists(email, person?.id);
    if (exists) {
      setEmailError('Este e-mail ja esta cadastrado no sistema');
    } else {
      setEmailError(null);
    }
  } finally {
    setIsCheckingEmail(false);
  }
};
```

**Campo de email atualizado:**

```tsx
<div className="space-y-2 sm:col-span-2">
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    type="email" 
    {...register('email')} 
    placeholder="joao@email.com"
    onBlur={handleEmailBlur}
    className={emailError ? 'border-destructive' : ''}
  />
  {isCheckingEmail && (
    <p className="text-sm text-muted-foreground flex items-center gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Verificando...
    </p>
  )}
  {emailError && (
    <p className="text-sm text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {emailError}
    </p>
  )}
  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
</div>
```

**Botao de submit desabilitado:**

```tsx
<Button 
  type="submit" 
  disabled={isLoading || !!emailError}
>
  ...
</Button>
```

---

### AddContactPersonDialog.tsx

**Estado adicional:**

```typescript
const [emailError, setEmailError] = useState<string | null>(null);
const [isCheckingEmail, setIsCheckingEmail] = useState(false);
```

**Funcao de verificacao:**

```typescript
const checkEmailExists = async (email: string): Promise<boolean> => {
  if (!email || email.trim() === '') return false;
  
  const { data } = await supabase
    .from('people')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  
  return !!data;
};
```

**Handler onBlur:**

```typescript
const handleEmailBlur = async () => {
  if (!newPersonEmail || newPersonEmail.trim() === '') {
    setEmailError(null);
    return;
  }
  
  setIsCheckingEmail(true);
  try {
    const exists = await checkEmailExists(newPersonEmail);
    if (exists) {
      setEmailError('Este e-mail ja esta cadastrado no sistema');
    } else {
      setEmailError(null);
    }
  } finally {
    setIsCheckingEmail(false);
  }
};
```

**Campo atualizado:**

```tsx
<div className="space-y-2">
  <Label htmlFor="new-person-email">Email</Label>
  <Input
    id="new-person-email"
    type="email"
    value={newPersonEmail}
    onChange={(e) => {
      setNewPersonEmail(e.target.value);
      if (emailError) setEmailError(null); // Limpa erro ao digitar
    }}
    onBlur={handleEmailBlur}
    placeholder="email@empresa.com"
    className={emailError ? 'border-destructive' : ''}
  />
  {isCheckingEmail && (
    <p className="text-sm text-muted-foreground flex items-center gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Verificando...
    </p>
  )}
  {emailError && (
    <p className="text-sm text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {emailError}
    </p>
  )}
</div>
```

**Botao desabilitado:**

```tsx
<Button
  className="w-full"
  onClick={handleCreatePerson}
  disabled={isCreating || !newPersonName.trim() || !!emailError}
>
```

**Reset do formulario:**

```typescript
const resetForm = () => {
  // ... campos existentes
  setEmailError(null);
};
```

---

## Fluxo Visual

```text
Usuario digita email
       |
       v
Sai do campo (blur)
       |
       v
Mostra "Verificando..."
       |
       v
   Existe?
   /     \
 Sim     Nao
  |       |
  v       v
Mostra   Limpa
erro     erro
  |
  v
Botao DESABILITADO
```

---

## Imports Necessarios

- `AlertCircle` de lucide-react (para icone de erro)
- `useState` do React (ja importado)

