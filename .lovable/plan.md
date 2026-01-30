

# Melhorar Historico do Deal com Mais Eventos

## Objetivo

Registrar automaticamente mais tipos de eventos no historico do negocio:

1. Alteracoes de valor
2. Mudancas de pessoa de contato
3. Mudancas de organizacao
4. Atividades relacionadas (criacao e conclusao)

---

## Situacao Atual vs Solicitada

| Evento | Status Atual | Acao |
|--------|--------------|------|
| Mudancas de etapa | Trigger automatico | MANTER |
| Criacao do negocio | Trigger automatico | MANTER |
| Notas adicionadas | Log via JavaScript | MANTER |
| Arquivos enviados | Log via JavaScript | MANTER |
| Ganho/Perdido | Log via JavaScript | MANTER |
| **Alteracoes de valor** | NAO EXISTE | CRIAR trigger |
| **Mudanca de pessoa** | NAO EXISTE | CRIAR trigger |
| **Mudanca de organizacao** | NAO EXISTE | CRIAR trigger |
| **Atividades criadas** | NAO EXISTE | CRIAR log via JS |

---

## Parte 1: Triggers no Banco de Dados

### Nova Funcao para Registrar Multiplas Alteracoes

Criar uma funcao de trigger mais completa que monitora mudancas em:
- `value` (valor do negocio)
- `person_id` (pessoa de contato)
- `organization_id` (organizacao)

```sql
CREATE OR REPLACE FUNCTION public.log_deal_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_person_name TEXT;
  new_person_name TEXT;
  old_org_name TEXT;
  new_org_name TEXT;
BEGIN
  -- Mudanca de valor
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO deal_history (deal_id, event_type, description, old_value, new_value, created_by)
    VALUES (
      NEW.id,
      'value_change',
      'Valor alterado: R$ ' || COALESCE(OLD.value::text, '0') || ' → R$ ' || COALESCE(NEW.value::text, '0'),
      OLD.value::text,
      NEW.value::text,
      auth.uid()
    );
  END IF;

  -- Mudanca de pessoa de contato
  IF OLD.person_id IS DISTINCT FROM NEW.person_id THEN
    SELECT name INTO old_person_name FROM people WHERE id = OLD.person_id;
    SELECT name INTO new_person_name FROM people WHERE id = NEW.person_id;
    
    INSERT INTO deal_history (deal_id, event_type, description, old_value, new_value, created_by)
    VALUES (
      NEW.id,
      'person_change',
      CASE 
        WHEN NEW.person_id IS NULL THEN 'Pessoa de contato removida: ' || COALESCE(old_person_name, 'N/A')
        WHEN OLD.person_id IS NULL THEN 'Pessoa de contato adicionada: ' || COALESCE(new_person_name, 'N/A')
        ELSE 'Pessoa alterada: ' || COALESCE(old_person_name, 'N/A') || ' → ' || COALESCE(new_person_name, 'N/A')
      END,
      old_person_name,
      new_person_name,
      auth.uid()
    );
  END IF;

  -- Mudanca de organizacao
  IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    SELECT name INTO old_org_name FROM organizations WHERE id = OLD.organization_id;
    SELECT name INTO new_org_name FROM organizations WHERE id = NEW.organization_id;
    
    INSERT INTO deal_history (deal_id, event_type, description, old_value, new_value, created_by)
    VALUES (
      NEW.id,
      'organization_change',
      CASE 
        WHEN NEW.organization_id IS NULL THEN 'Organizacao removida: ' || COALESCE(old_org_name, 'N/A')
        WHEN OLD.organization_id IS NULL THEN 'Organizacao adicionada: ' || COALESCE(new_org_name, 'N/A')
        ELSE 'Organizacao alterada: ' || COALESCE(old_org_name, 'N/A') || ' → ' || COALESCE(new_org_name, 'N/A')
      END,
      old_org_name,
      new_org_name,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;
```

### Novo Trigger

```sql
CREATE TRIGGER deal_field_changes_trigger
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_field_changes();
```

---

## Parte 2: Atualizar DealTimeline.tsx

### Novos Tipos de Evento

Adicionar icones e cores para os novos eventos:

```typescript
const eventIcons: Record<string, React.ElementType> = {
  // ... existentes
  value_change: DollarSign,
  person_change: User,
  organization_change: Building2,
  activity_created: CalendarPlus,
};

const eventColors: Record<string, string> = {
  // ... existentes
  value_change: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  person_change: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  organization_change: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  activity_created: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};
```

### Exibir Valores Antigos e Novos

Para eventos de alteracao, mostrar de forma mais visual:

```typescript
{/* For value changes, show formatted values */}
{event.event_type === 'value_change' && event.old_value && event.new_value && (
  <div className="flex items-center gap-2 mt-1 text-sm">
    <span className="text-muted-foreground line-through">
      R$ {parseFloat(event.old_value).toLocaleString('pt-BR')}
    </span>
    <ArrowRight className="h-3 w-3" />
    <span className="text-foreground font-medium">
      R$ {parseFloat(event.new_value).toLocaleString('pt-BR')}
    </span>
  </div>
)}
```

---

## Parte 3: Log de Atividades Criadas

### Modificar ActivityFormSheet.tsx

Ao criar uma atividade vinculada a um deal, registrar no historico:

```typescript
// Apos criar atividade
if (values.deal_id) {
  await supabase.from('deal_history').insert({
    deal_id: values.deal_id,
    event_type: 'activity_created',
    description: `Atividade criada: ${values.title}`,
    metadata: { 
      activity_type: values.activity_type,
      due_date: values.due_date 
    },
    created_by: user?.id,
  });
}
```

---

## Layout Visual Aprimorado do Timeline

```text
┌─────────────────────────────────────────────────────────┐
│ [→] Etapa alterada: Cotacao → Proposta                  │
│     30 Jan as 17:30 • Joao Silva                        │
├─────────────────────────────────────────────────────────┤
│ [$] Valor alterado                                      │
│     R$ 45.000 → R$ 52.000                               │
│     30 Jan as 16:45 • Maria Santos                      │
├─────────────────────────────────────────────────────────┤
│ [👤] Pessoa alterada: Ana → Carlos                       │
│     29 Jan as 14:20 • Joao Silva                        │
├─────────────────────────────────────────────────────────┤
│ [📅] Atividade criada: Ligar para cliente               │
│     28 Jan as 10:15 • Maria Santos                      │
├─────────────────────────────────────────────────────────┤
│ [✓] Atividade concluida: Enviar proposta                │
│     27 Jan as 09:00 • Joao Silva                        │
├─────────────────────────────────────────────────────────┤
│ [+] Negocio criado                                      │
│     25 Jan as 08:30 • Joao Silva                        │
└─────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| Nova migration SQL | Criar trigger para value, person, organization |
| `src/components/deals/detail/DealTimeline.tsx` | Adicionar novos tipos, melhorar visualizacao |
| `src/components/activities/ActivityFormSheet.tsx` | Registrar criacao de atividade no historico |

---

## Observacoes

1. **Trigger unico por UPDATE**: Como ja existe `deal_stage_change_trigger`, criaremos um segundo trigger para os demais campos
2. **Metadata**: Usaremos o campo `metadata` (JSONB) para dados adicionais
3. **Formatacao de valores**: Os valores serao formatados em portugues brasileiro
4. **RLS ja funciona**: O deal_history ja tem policies corretas para INSERT/SELECT

---

## Estimativa

| Tarefa | Tempo |
|--------|-------|
| Criar migration com novo trigger | 20min |
| Atualizar DealTimeline.tsx | 25min |
| Adicionar log de atividades | 15min |
| Testes | 20min |
| **Total** | **~1h20** |

