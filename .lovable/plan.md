
# Mover QuickNoteCard para Dentro da Aba Notas

## Situacao Atual

O layout atual esta assim:

```
Header
QuickNoteCard (sempre visivel)
Grid [Sidebar | Tabs(Notas, Arquivos...)]
```

## Layout Desejado

```
Header
Grid [Sidebar | Tabs(Notas, Arquivos...)]
                 |-> TabsContent(notes): QuickNoteCard + Lista de Notas
```

O QuickNoteCard deve aparecer apenas quando a aba "Notas" esta selecionada.

---

## Modificacao

### Arquivo: `src/pages/OrganizationDetails.tsx`

**1. Remover o QuickNoteCard da posicao atual (linhas 283-289)**

Remover este bloco que esta antes do grid:

```typescript
{/* Quick Note Card */}
<QuickNoteCard
  organizationId={id || ''}
  organizationName={organization.name}
  onAddNote={addNote}
  isAdding={isAddingNote}
/>
```

**2. Adicionar o QuickNoteCard dentro do TabsContent de "notes"**

Modificar o TabsContent de notes (linha 327-338) para incluir o QuickNoteCard antes do OrganizationNotes:

```typescript
<TabsContent value="notes" className="mt-4 space-y-4">
  <QuickNoteCard
    organizationId={id || ''}
    organizationName={organization.name}
    onAddNote={addNote}
    isAdding={isAddingNote}
  />
  <OrganizationNotes
    notes={notes}
    onAddNote={addNote}
    onTogglePin={togglePin}
    onDeleteNote={deleteNote}
    onEditNote={updateNote}
    isAdding={isAddingNote}
    organizationId={id || ''}
    organizationName={organization.name}
  />
</TabsContent>
```

---

## Resultado

| Antes | Depois |
|-------|--------|
| QuickNoteCard sempre visivel acima do grid | QuickNoteCard visivel apenas na aba Notas |
| Tabs aparecem abaixo do card | Tabs aparecem primeiro, card dentro do conteudo |
