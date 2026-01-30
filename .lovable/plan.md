

# Validacao de WhatsApp Duplicado em Tempo Real (onBlur)

## Objetivo

Implementar validacao inline do campo de WhatsApp quando o usuario sai do campo, verificando se o WhatsApp ja existe no banco de dados e mostrando erro visual antes do submit.

---

## Componentes Afetados

1. **PersonForm.tsx** - formulario principal
2. **AddContactPersonDialog.tsx** - dialog de criacao rapida

---

## Modificacoes Detalhadas

### PersonForm.tsx

**1. Adicionar estados para WhatsApp (junto aos estados de email, linha 56-57):**

```typescript
const [whatsappError, setWhatsappError] = useState<string | null>(null);
const [isCheckingWhatsapp, setIsCheckingWhatsapp] = useState(false);
```

**2. Adicionar handler onBlur para WhatsApp (apos handleEmailBlur, linha 318):**

```typescript
const handleWhatsappBlur = async () => {
  const whatsapp = watch('whatsapp');
  if (!whatsapp || whatsapp.trim() === '') {
    setWhatsappError(null);
    return;
  }
  
  setIsCheckingWhatsapp(true);
  try {
    const exists = await checkWhatsappExists(whatsapp, person?.id);
    if (exists) {
      setWhatsappError('Este WhatsApp ja esta cadastrado no sistema');
    } else {
      setWhatsappError(null);
    }
  } finally {
    setIsCheckingWhatsapp(false);
  }
};
```

**3. Atualizar o campo WhatsApp (linhas 396-402):**

```tsx
<div className="space-y-2">
  <Label htmlFor="whatsapp">WhatsApp</Label>
  <PhoneInput
    id="whatsapp"
    value={watch('whatsapp') || ''}
    onValueChange={(value) => {
      setValue('whatsapp', value);
      if (whatsappError) setWhatsappError(null);
    }}
    onBlur={handleWhatsappBlur}
    className={whatsappError ? 'border-destructive' : ''}
  />
  {isCheckingWhatsapp && (
    <p className="text-sm text-muted-foreground flex items-center gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Verificando...
    </p>
  )}
  {whatsappError && (
    <p className="text-sm text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {whatsappError}
    </p>
  )}
</div>
```

**4. Atualizar o botao de submit (linha 476):**

```tsx
<Button type="submit" disabled={isLoading || !!emailError || !!whatsappError}>
```

---

### AddContactPersonDialog.tsx

**1. Adicionar estados para WhatsApp (junto aos estados de email, linha 60-61):**

```typescript
const [whatsappError, setWhatsappError] = useState<string | null>(null);
const [isCheckingWhatsapp, setIsCheckingWhatsapp] = useState(false);
```

**2. Adicionar funcao de verificacao de WhatsApp (apos checkEmailExists, linha 74):**

```typescript
const checkWhatsappExists = async (whatsapp: string): Promise<boolean> => {
  if (!whatsapp || whatsapp.trim() === '') return false;
  
  const { data } = await supabase
    .from('people')
    .select('id')
    .eq('whatsapp', whatsapp.trim())
    .maybeSingle();
  
  return !!data;
};
```

**3. Adicionar handler onBlur para WhatsApp (apos handleEmailBlur, linha 94):**

```typescript
const handleWhatsappBlur = async () => {
  if (!newPersonWhatsapp || newPersonWhatsapp.trim() === '') {
    setWhatsappError(null);
    return;
  }
  
  setIsCheckingWhatsapp(true);
  try {
    const exists = await checkWhatsappExists(newPersonWhatsapp);
    if (exists) {
      setWhatsappError('Este WhatsApp ja esta cadastrado no sistema');
    } else {
      setWhatsappError(null);
    }
  } finally {
    setIsCheckingWhatsapp(false);
  }
};
```

**4. Atualizar o campo WhatsApp (linhas 326-333):**

```tsx
<div className="space-y-2">
  <Label htmlFor="new-person-whatsapp">WhatsApp</Label>
  <PhoneInput
    id="new-person-whatsapp"
    value={newPersonWhatsapp}
    onValueChange={(value) => {
      setNewPersonWhatsapp(value);
      if (whatsappError) setWhatsappError(null);
    }}
    onBlur={handleWhatsappBlur}
    className={whatsappError ? 'border-destructive' : ''}
  />
  {isCheckingWhatsapp && (
    <p className="text-sm text-muted-foreground flex items-center gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Verificando...
    </p>
  )}
  {whatsappError && (
    <p className="text-sm text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {whatsappError}
    </p>
  )}
</div>
```

**5. Atualizar resetForm (linha 179-188):**

```typescript
const resetForm = () => {
  // ... campos existentes
  setWhatsappError(null);
};
```

**6. Atualizar o botao de submit (linha 364-367):**

```tsx
<Button
  className="w-full"
  onClick={handleCreatePerson}
  disabled={isCreating || !newPersonName.trim() || !!emailError || !!whatsappError}
>
```

---

## Nota sobre PhoneInput

O componente PhoneInput precisa suportar `onBlur` e `className`. Verificarei se precisa de ajustes para aceitar essas props, passando-as ao Input interno.

---

## Fluxo Visual

```text
Usuario digita WhatsApp
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

