
# Formatar Nomes dos Socios em Title Case

## Problema
Os nomes dos socios vindos da API da Receita Federal (Casa dos Dados) chegam em LETRAS MAIUSCULAS (ex: "CAROLINE CRISTIANE LORENCO RITA") e sao salvos assim no banco. O padrao do sistema e Title Case (ex: "Caroline Cristiane Lorenco Rita"), respeitando particulas da lingua portuguesa em minuscula ("da", "de", "do", etc.).

## Solucao
Adicionar uma funcao `toTitleCase` diretamente na Edge Function `enrich-organization` para formatar os nomes dos socios antes de salva-los no banco. A mesma logica ja existente no frontend (`src/lib/import.ts`) sera replicada na Edge Function.

## Alteracoes

### 1. `supabase/functions/enrich-organization/index.ts`

- Adicionar a funcao auxiliar `toTitleCase` no inicio do arquivo (identica a versao do frontend, com suporte a particulas brasileiras: "da", "de", "do", "dos", "das", "e")
- Aplicar `toTitleCase` no nome do socio (linha 300): `name: toTitleCase(socio.nome || 'Socio')`
- Aplicar `toTitleCase` tambem no nome do representante legal (linha 306): `legal_rep_name: toTitleCase(socio.representante_legal?.nome || '')`

### Secao Tecnica

**Funcao a ser adicionada na Edge Function:**
```typescript
const LOWERCASE_PARTICLES = new Set(['da', 'de', 'do', 'dos', 'das', 'e']);

function toTitleCase(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map((word, index) => {
      if (index > 0 && LOWERCASE_PARTICLES.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
```

**Linha 300 - antes:**
```typescript
name: socio.nome || 'Socio',
```

**Linha 300 - depois:**
```typescript
name: toTitleCase(socio.nome || 'Socio'),
```

**Linha 306 - antes:**
```typescript
legal_rep_name: socio.representante_legal?.nome || null,
```

**Linha 306 - depois:**
```typescript
legal_rep_name: socio.representante_legal?.nome ? toTitleCase(socio.representante_legal.nome) : null,
```

Apenas 1 arquivo sera modificado. Apos a alteracao, a Edge Function sera re-deployada automaticamente. Para ver o efeito, basta clicar novamente em "Atualizar dados" na organizacao.
