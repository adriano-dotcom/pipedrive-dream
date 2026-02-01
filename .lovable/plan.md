
# Analise do Problema: Navegacao para Detalhes de Contato

## Diagnostico

Apos analise profunda do codigo e das imagens enviadas, identifiquei o seguinte:

### O que esta funcionando
- O Link do react-router-dom esta configurado corretamente em `PeopleTable.tsx` (linha 252-258)
- A rota `/people/:id` existe em `App.tsx` (linha 81-88)
- A navegacao **ESTA acontecendo** - a URL muda para `/people/56131188-...` como mostrado na segunda imagem
- O contato existe no banco de dados (confirmado via network requests)

### Problema identificado
A navegacao ocorre, mas a **pagina de detalhes (PersonDetails.tsx) pode nao estar renderizando corretamente**. Possiveis causas:

1. **Loading infinito**: O componente pode estar preso no estado de loading
2. **Query falhando**: O hook `usePersonDetails` pode estar retornando null
3. **Erro silencioso**: Alguma query relacionada pode estar falhando sem exibir erro

## Verificacao adicional necessaria

Para confirmar a causa raiz, seria necessario:
- Ver o conteudo exato da tela apos a navegacao (tela branca? loading? mensagem de erro?)
- Verificar os logs do console no momento do acesso a pagina de detalhes
- Verificar se ha erros de rede nas requests de `/people/:id`

## Plano de correcao

Se confirmado que o problema e na renderizacao da pagina de detalhes:

### 1. Adicionar tratamento de erro robusto em PersonDetails.tsx

Melhorar o feedback visual para estados de erro:

| Cenario | Comportamento Atual | Comportamento Proposto |
|---------|--------------------|-----------------------|
| Loading | Mostra skeleton | Manter skeleton + timeout de 10s |
| Erro de query | Nao tratado | Mostrar mensagem + botao recarregar |
| Pessoa nao encontrada | Mostra mensagem | Manter + adicionar mais contexto |

### 2. Melhorar o hook usePersonDetails

Adicionar estado de erro explicito:

```typescript
const { data: person, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['person', personId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('people')
      .select(`...`)
      .eq('id', personId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },
  enabled: !!personId,
  retry: 2,
  retryDelay: 1000,
});

// Retornar isError e refetch
return {
  person,
  isLoading,
  isError,
  error,
  refetch,
  // ... resto
};
```

### 3. Atualizar PersonDetails.tsx para tratar erros

```typescript
if (isError) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Erro ao carregar pessoa</h2>
      <p className="text-muted-foreground mb-4">
        Nao foi possivel carregar os dados. Tente novamente.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => refetch()}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
        <Button variant="outline" onClick={() => navigate('/people')}>
          Voltar para Pessoas
        </Button>
      </div>
    </div>
  );
}
```

## Arquivos a modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/hooks/usePersonDetails.ts` | Adicionar isError, error, refetch ao retorno |
| `src/pages/PersonDetails.tsx` | Adicionar tratamento de erro + timeout de loading |

## Proximos passos

Para prosseguir com a correcao, preciso confirmar:
1. **O que aparece na tela apos clicar no contato?** (branco? loading infinito? erro?)
2. **Ha algum erro no console do navegador apos a navegacao?**

Com essas informacoes, posso implementar a correcao apropriada.
