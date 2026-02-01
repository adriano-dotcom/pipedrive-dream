

# Adicionar Contagem de Registros no Cabeçalho de Pessoas e Organizações

## Objetivo

Mostrar a contagem total de registros ao lado do título nas páginas de Pessoas e Organizações, similar ao padrão de CRMs modernos.

## Resultado Visual Esperado

**Antes:**
```
Pessoas
Gerencie contatos individuais e leads
```

**Depois:**
```
Pessoas (984)
Gerencie contatos individuais e leads
```

## Modificações

### 1. Página de Pessoas (`src/pages/People.tsx`)

Alterar o título na linha 296 para incluir a contagem:

```typescript
// Antes
<h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>

// Depois
<h1 className="text-2xl font-bold tracking-tight">
  Pessoas
  {!isLoading && totalCount > 0 && (
    <span className="ml-2 text-lg font-normal text-muted-foreground">
      ({totalCount.toLocaleString('pt-BR')})
    </span>
  )}
</h1>
```

### 2. Página de Organizações (`src/pages/Organizations.tsx`)

Alterar o título na linha 395 para incluir a contagem:

```typescript
// Antes
<h1 className="text-2xl font-bold tracking-tight">Organizações</h1>

// Depois
<h1 className="text-2xl font-bold tracking-tight">
  Organizações
  {!isLoading && totalCount > 0 && (
    <span className="ml-2 text-lg font-normal text-muted-foreground">
      ({totalCount.toLocaleString('pt-BR')})
    </span>
  )}
</h1>
```

## Detalhes da Implementação

| Aspecto | Decisão |
|---------|---------|
| Formatação do número | Usar `toLocaleString('pt-BR')` para separador de milhares (ex: 1.234) |
| Quando mostrar | Apenas quando `!isLoading && totalCount > 0` |
| Estilo visual | Fonte menor (`text-lg`), peso normal, cor `text-muted-foreground` |
| Comportamento com filtros | Mostra contagem filtrada (não o total absoluto) |

## Arquivos a Modificar

| Arquivo | Linha | Modificação |
|---------|-------|-------------|
| `src/pages/People.tsx` | 296 | Adicionar contagem ao título |
| `src/pages/Organizations.tsx` | 395 | Adicionar contagem ao título |

