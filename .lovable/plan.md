
# Melhorar DealSidebar com Informacoes Faltantes

## Objetivo

Adicionar campos importantes que estao faltando na sidebar de detalhes do negocio, seguindo o padrao das sidebars de Pessoas e Organizacoes:

- Data de criacao
- Tempo em pipeline
- Status visual (Aberto/Ganho/Perdido)

---

## Campos Solicitados vs Situacao Atual

| Campo | Situacao | Acao |
|-------|----------|------|
| Valor do negocio | JA EXISTE | Manter |
| Etapa/Status | JA EXISTE (parcial) | Adicionar badge de status |
| Pessoa de contato | JA EXISTE | Ja clicavel |
| Organizacao | JA EXISTE | Ja clicavel |
| Data de criacao | FALTA | Adicionar |
| Probabilidade de ganho | JA EXISTE | Manter |
| Data esperada de fechamento | JA EXISTE | Manter |
| Tempo em pipeline | FALTA | Calcular e adicionar |

---

## Modificacoes no DealSidebar.tsx

### 1. Atualizar Interface DealSidebarProps

Adicionar campos necessarios:

```typescript
interface DealSidebarProps {
  deal: {
    // ... campos existentes
    created_at: string;        // NOVO
    status: string;            // NOVO
  };
}
```

### 2. Adicionar Secao "Visao Geral"

Nova secao similar a PersonSidebar/OrganizationSidebar:

```typescript
<SidebarSection title="Visao Geral" icon={Clock}>
  <div className="space-y-0.5">
    {/* Status do Negocio */}
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">Status</span>
      <Badge variant={...} className={...}>
        {getStatusLabel(deal.status)}
      </Badge>
    </div>
    
    {/* Data de Criacao */}
    <InfoRow 
      label="Criado em" 
      value={format(new Date(deal.created_at), 'dd/MM/yyyy')} 
      icon={Calendar} 
    />
    
    {/* Tempo em Pipeline */}
    <InfoRow 
      label="Tempo no pipeline" 
      value={formatDistanceToNow(new Date(deal.created_at), { locale: ptBR })} 
      icon={Clock} 
    />
  </div>
</SidebarSection>
```

### 3. Adicionar Funcao Helper para Status

```typescript
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'won':
      return { label: 'Ganho', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
    case 'lost':
      return { label: 'Perdido', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    default:
      return { label: 'Aberto', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
  }
};
```

### 4. Importar Dependencias

```typescript
import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
```

---

## Layout Final da Sidebar

```text
┌─────────────────────────────────┐
│ [👤] Pessoa                     │
│     Nome (clicavel) [✏️]         │
│     Cargo                       │
│     📞 Telefone                 │
│     ✉️ Email           [📧]     │
├─────────────────────────────────┤
│ [🏢] Organizacao                │
│     Nome (clicavel) [✏️]         │
│     📞 Telefone                 │
│     ✉️ Email           [📧]     │
├─────────────────────────────────┤
│ [🕐] Visao Geral        <NOVO>  │
│     Status: [Aberto/Ganho/...]  │
│     Criado em: 15/01/2025       │
│     Tempo no pipeline: 15 dias  │
├─────────────────────────────────┤
│ [💰] Resumo                     │
│     Funil: Vendas               │
│     Etapa: Cotacao              │
│     Valor: R$ 50.000            │
│     Probabilidade: 60%          │
│     Fechamento previsto: ...    │
├─────────────────────────────────┤
│ [🛡️] Detalhes do Seguro        │
│     (recolhido por padrao)      │
├─────────────────────────────────┤
│ [📝] Observacoes                │
│     (se houver notas)           │
└─────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/deals/detail/DealSidebar.tsx` | Adicionar Visao Geral, status badge, tempo no pipeline |

---

## Observacoes Importantes

1. **Dados ja disponiveis**: O hook `useDealDetails` ja busca `*` da tabela deals, entao `created_at` e `status` ja estao disponiveis
2. **Nao precisa alterar DealDetails.tsx**: O componente ja passa `deal` completo para DealSidebar
3. **Consistencia visual**: Usar os mesmos componentes e estilos de PersonSidebar/OrganizationSidebar
4. **Reordenacao**: Mover "Visao Geral" para antes de "Resumo" para melhor hierarquia de informacao
