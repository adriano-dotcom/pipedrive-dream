
# Adicionar Campo "Captado por" no Formulário de Pessoas

## Resumo

O usuário deseja poder atribuir manualmente o vendedor responsável ("Captado por") ao criar ou editar uma pessoa. Atualmente, esse campo só é preenchido automaticamente quando o contato vem do WhatsApp.

---

## O Que Será Implementado

### 1. Adicionar Campo de Seleção de Vendedor no Formulário

Será adicionado um novo campo "Captado por" na seção de "Informações Básicas" do formulário de pessoas, permitindo selecionar qualquer membro da equipe como responsável pelo lead.

### 2. Comportamento

- **Novo contato**: O campo inicia vazio, mas pode ser preenchido manualmente
- **Editar contato**: O campo mostra o vendedor atual (se houver) e permite alterar
- **Visual**: Dropdown com avatar + nome do vendedor (similar ao usado em outras partes do sistema)

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/people/PersonForm.tsx` | Adicionar campo `owner_id` no formulário com dropdown de vendedores |

---

## Detalhes Técnicos

### Mudanças no PersonForm.tsx

**1. Adicionar campo no schema Zod:**
```typescript
const personSchema = z.object({
  // ... campos existentes ...
  owner_id: z.string().uuid().optional().or(z.literal('')),
});
```

**2. Adicionar import do hook de vendedores:**
```typescript
import { useVendedores } from '@/hooks/useVendedores';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
```

**3. Buscar lista de vendedores:**
```typescript
const { data: vendedores } = useVendedores();
```

**4. Adicionar defaultValue para owner_id:**
```typescript
defaultValues: {
  // ... existentes ...
  owner_id: person?.owner_id || '',
}
```

**5. Adicionar campo no formulário (após Organização):**
```tsx
<div className="space-y-2">
  <Label htmlFor="owner_id">Captado por</Label>
  <Select
    value={ownerValue || ''}
    onValueChange={(value) => setValue('owner_id', value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Selecione o vendedor..." />
    </SelectTrigger>
    <SelectContent>
      {vendedores?.map((vendedor) => (
        <SelectItem key={vendedor.user_id} value={vendedor.user_id}>
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={vendedor.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(vendedor.full_name)}
              </AvatarFallback>
            </Avatar>
            {vendedor.full_name}
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**6. Atualizar mutations para incluir owner_id:**

Na criação:
```typescript
owner_id: data.owner_id || user?.id,  // Se não selecionado, usa o próprio usuário
```

Na atualização:
```typescript
owner_id: data.owner_id || null,
```

---

## Visualização Esperada

O formulário de pessoa terá um novo campo:

```text
┌─────────────────────────────────────────────────┐
│ Informações Básicas                              │
├─────────────────────────────────────────────────┤
│ Nome Completo *         │ CPF                    │
│ [João da Silva     ]    │ [000.000.000-00]       │
├─────────────────────────────────────────────────┤
│ Cargo                   │ Organização            │
│ [Gerente          ]     │ [Empresa XYZ ▼]        │
├─────────────────────────────────────────────────┤
│ Captado por             │ Status/Temperatura     │  ← NOVO
│ [[👤] Adriana Jac... ▼] │ [🔥 Quente ▼]          │
└─────────────────────────────────────────────────┘
```

---

## Resultado Esperado

1. Usuários podem definir manualmente quem captou o lead ao criar uma pessoa
2. Usuários podem alterar o vendedor responsável ao editar uma pessoa
3. O campo mostra avatar e nome do vendedor para fácil identificação
4. Mantém compatibilidade com leads criados automaticamente via WhatsApp
