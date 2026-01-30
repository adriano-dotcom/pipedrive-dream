

# Validacao de CNPJ Duplicado em Tempo Real (onBlur)

## Objetivo

Implementar validacao inline do campo de CNPJ quando o usuario sai do campo, verificando se o CNPJ ja existe no banco de dados e mostrando erro visual antes do submit.

---

## Componente Afetado

**OrganizationForm.tsx** - formulario de organizacoes

---

## Situacao Atual

O componente ja possui a funcao `checkCnpjExists` (linhas 60-75) que e usada durante o submit. Precisamos adicionar a validacao no blur do campo CNPJ.

---

## Modificacoes Detalhadas

### OrganizationForm.tsx

**1. Adicionar estados para CNPJ (apos linha 80):**

```typescript
const [cnpjError, setCnpjError] = useState<string | null>(null);
const [isCheckingCnpj, setIsCheckingCnpj] = useState(false);
```

**2. Adicionar import do AlertCircle (linha 23):**

```typescript
import { Loader2, AlertCircle } from 'lucide-react';
```

**3. Adicionar handler onBlur para CNPJ (apos fetchCnpjData, linha 173):**

```typescript
const handleCnpjBlur = async () => {
  const cnpj = watch('cnpj');
  if (!cnpj || cnpj.trim() === '') {
    setCnpjError(null);
    return;
  }
  
  // Precisa ter 14 digitos para validar
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) {
    return;
  }
  
  setIsCheckingCnpj(true);
  try {
    const exists = await checkCnpjExists(cnpj, organization?.id);
    if (exists) {
      setCnpjError('Este CNPJ ja esta cadastrado no sistema');
    } else {
      setCnpjError(null);
    }
  } finally {
    setIsCheckingCnpj(false);
  }
};
```

**4. Atualizar o campo CNPJ (linhas 331-352):**

```tsx
<div className="space-y-2">
  <Label htmlFor="cnpj">CNPJ</Label>
  <div className="relative">
    <CnpjInput
      id="cnpj"
      value={watch('cnpj') || ''}
      onValueChange={(value) => {
        setValue('cnpj', value);
        if (cnpjError) setCnpjError(null); // Limpa erro ao digitar
        // Fetch company data when CNPJ has 14 digits
        if (value.length === 14 && !organization) {
          fetchCnpjData(value);
        }
      }}
      onBlur={handleCnpjBlur}
      disabled={isFetchingCnpj}
      className={cn(
        isFetchingCnpj ? 'pr-10' : '',
        cnpjError ? 'border-destructive' : ''
      )}
    />
    {isFetchingCnpj && (
      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
    )}
  </div>
  {isCheckingCnpj && (
    <p className="text-sm text-muted-foreground flex items-center gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Verificando...
    </p>
  )}
  {cnpjError && (
    <p className="text-sm text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {cnpjError}
    </p>
  )}
  {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj.message}</p>}
</div>
```

**5. Adicionar import do cn (linha 6 ou existente):**

Verificar se `cn` ja esta importado, caso contrario adicionar:

```typescript
import { cn } from '@/lib/utils';
```

**6. Atualizar o botao de submit (linha ~509):**

```tsx
<Button type="submit" disabled={isLoading || !!cnpjError}>
```

---

## Fluxo Visual

```text
Usuario digita CNPJ
       |
       v
Sai do campo (blur)
       |
       v
CNPJ tem 14 digitos?
   /        \
 Nao        Sim
  |          |
  v          v
Ignora    Mostra "Verificando..."
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

## Nota sobre CnpjInput

O componente CnpjInput ja suporta `className` e passa `{...props}` ao PatternFormat, portanto `onBlur` sera passado automaticamente.

