
# Plano: Mover Card Pessoas para Debaixo de Resumo

## Objetivo
Reordenar os cards na sidebar da página de detalhes da organização, movendo o card "Pessoas" para ser exibido logo após o card "Resumo".

---

## Situação Atual

A ordem dos cards na sidebar é:
1. Resumo
2. Visão Geral
3. Dados da Receita Federal
4. Detalhes do Seguro (condicional)
5. Frota (condicional)
6. Pessoas (condicional)
7. Endereço (condicional)

---

## Nova Ordem Desejada

1. Resumo
2. **Pessoas** (movido para cá)
3. Visão Geral
4. Dados da Receita Federal
5. Detalhes do Seguro (condicional)
6. Frota (condicional)
7. Endereço (condicional)

---

## Alteração Necessária

### Arquivo: `src/components/organizations/detail/OrganizationSidebar.tsx`

Mover o bloco do card "Pessoas" (linhas 496-596) para logo após o card "Resumo" (após linha 342).

O código a ser movido é:

```tsx
{/* People Card */}
{people.length > 0 && (
  <Card className="glass border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        Pessoas ({people.length})
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {/* ... conteúdo do card ... */}
    </CardContent>
  </Card>
)}
```

---

## Resultado Visual

```text
┌─────────────────────────┐
│  📋 Resumo              │
│  CNPJ: XX.XXX.XXX/XXXX  │
│  Telefone, Email, etc.  │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│  👤 Pessoas (1)         │  ← MOVIDO PARA CÁ
│  ○ Jhuliany             │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│  🕐 Visão Geral         │
│  Atividades Pendentes   │
│  etc.                   │
└─────────────────────────┘
         ↓
       (...)
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/organizations/detail/OrganizationSidebar.tsx` | Mover bloco do card Pessoas (linhas 496-596) para após o card Resumo (linha 342) |
