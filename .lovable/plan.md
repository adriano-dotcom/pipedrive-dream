
# Histórico Agrupado por Dia com Expand/Collapse

## Resumo

Modificar o componente `PersonTimeline` para agrupar os eventos do histórico por dia, permitindo que o usuário expanda ou recolha cada grupo de dia clicando no cabeçalho.

---

## Visualização Esperada

**Antes (lista plana):**
```
Histórico (22)
├── WhatsApp: "[document]"    02/02/26 19:22
├── WhatsApp: "Perfeito"      02/02/26 19:22
├── WhatsApp: "Oi"            02/02/26 18:45
├── Nota adicionada           01/02/26 14:30
└── ...
```

**Depois (agrupado por dia, com expand/collapse):**
```
Histórico (22)

▼ Hoje - 04/02/2026 (3 eventos)
├── WhatsApp: "Oi"            14:30
├── Nota adicionada           10:15
└── Arquivo enviado           09:00

► Ontem - 03/02/2026 (5 eventos)
  [recolhido - clique para expandir]

▼ 02/02/2026 (14 eventos)
├── WhatsApp: "[document]"    19:22
├── WhatsApp: "Perfeito"      19:22
└── ...
```

---

## Comportamento

### Grupos de Dias
- Eventos agrupados por data (dia/mês/ano)
- Header mostra: data formatada + quantidade de eventos
- Datas especiais: "Hoje", "Ontem" quando aplicável

### Expand/Collapse
- Clique no header do dia para expandir/recolher
- Ícone de seta (ChevronDown/ChevronRight) indica estado
- Estado inicial: primeiro dia expandido, demais recolhidos
- Animação suave ao expandir/recolher

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/people/detail/PersonTimeline.tsx` | Agrupar eventos por dia com Collapsible |

---

## Detalhes Técnicos

### 1. Adicionar imports necessários

```typescript
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { isToday, isYesterday, startOfDay, format } from 'date-fns';
import { 
  Collapsible, 
  CollapsibleTrigger, 
  CollapsibleContent 
} from '@/components/ui/collapsible';
```

### 2. Criar função para agrupar eventos por dia

```typescript
interface DayGroup {
  date: Date;
  dateKey: string;
  label: string;
  events: PersonHistory[];
}

const groupEventsByDay = (history: PersonHistory[]): DayGroup[] => {
  const groups = new Map<string, DayGroup>();
  
  history.forEach(event => {
    const eventDate = new Date(event.created_at);
    const dayStart = startOfDay(eventDate);
    const dateKey = format(dayStart, 'yyyy-MM-dd');
    
    if (!groups.has(dateKey)) {
      let label = format(dayStart, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      if (isToday(dayStart)) {
        label = `Hoje - ${format(dayStart, 'dd/MM/yyyy')}`;
      } else if (isYesterday(dayStart)) {
        label = `Ontem - ${format(dayStart, 'dd/MM/yyyy')}`;
      }
      
      groups.set(dateKey, {
        date: dayStart,
        dateKey,
        label,
        events: [],
      });
    }
    
    groups.get(dateKey)!.events.push(event);
  });
  
  // Ordenar por data decrescente
  return Array.from(groups.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};
```

### 3. Gerenciar estado de expansão

```typescript
export function PersonTimeline({ history }: PersonTimelineProps) {
  // Agrupar eventos por dia
  const dayGroups = useMemo(() => groupEventsByDay(history), [history]);
  
  // Estado: primeiro dia aberto, demais fechados
  const [openDays, setOpenDays] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (dayGroups.length > 0) {
      initial.add(dayGroups[0].dateKey);
    }
    return initial;
  });

  const toggleDay = (dateKey: string) => {
    setOpenDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };
```

### 4. Renderizar grupos com Collapsible

```typescript
return (
  <Card className="glass border-border/50">
    <CardHeader className="pb-4">
      <CardTitle className="text-base flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        Histórico ({history.length})
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {dayGroups.map((group) => (
        <Collapsible
          key={group.dateKey}
          open={openDays.has(group.dateKey)}
          onOpenChange={() => toggleDay(group.dateKey)}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
            <div className="flex items-center gap-2">
              {openDays.has(group.dateKey) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">{group.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {group.events.length} {group.events.length === 1 ? 'evento' : 'eventos'}
            </span>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="relative mt-2 ml-2">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              
              <div className="space-y-3">
                {group.events.map((event) => (
                  <div key={event.id} className="relative flex gap-4 pl-10">
                    {/* Event icon */}
                    <div className={`absolute left-0 h-8 w-8 rounded-full flex items-center justify-center ${getEventColor(event.event_type)}`}>
                      {getEventIcon(event.event_type)}
                    </div>
                    
                    {/* Event content */}
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{event.description}</p>
                          {event.new_value && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {event.old_value && `${event.old_value} → `}{event.new_value}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.created_at), 'HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      {event.profile && (
                        <p className="text-xs text-muted-foreground mt-1">
                          por {event.profile.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </CardContent>
  </Card>
);
```

---

## Detalhes de UX

### Visual do Header do Dia
- Fundo suave (`bg-muted/50`) com hover
- Ícone de seta à esquerda (ChevronDown quando aberto, ChevronRight quando fechado)
- Data formatada no centro
- Contador de eventos à direita

### Hora vs Data Completa
- Dentro de cada grupo, mostramos apenas a **hora** (ex: `14:30`)
- A data já está no header do grupo, evitando repetição

### Animação
- O `CollapsibleContent` do Radix UI já inclui animação suave
- Transição de opacidade e altura automática

---

## Estado Inicial

- Primeiro grupo (dia mais recente) começa **expandido**
- Demais grupos começam **recolhidos**
- Usuário pode expandir múltiplos grupos simultaneamente
