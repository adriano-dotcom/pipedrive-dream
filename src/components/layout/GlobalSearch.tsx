import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Search, Building2, Users, Briefcase, Loader2, CheckSquare, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GlobalSearchProps {
  collapsed?: boolean;
  variant?: 'sidebar' | 'topbar';
}

type SearchCategory = 'all' | 'organizations' | 'people' | 'deals' | 'activities' | 'notes';

interface RecentItem {
  id: string;
  name: string;
  type: 'organization' | 'person' | 'deal';
  url: string;
  subtitle?: string;
  accessedAt: number;
}

const RECENT_ITEMS_KEY = 'crm-recent-items';
const MAX_RECENT_ITEMS = 10;

function getRecentItems(): RecentItem[] {
  try {
    const stored = localStorage.getItem(RECENT_ITEMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentItem(item: Omit<RecentItem, 'accessedAt'>): void {
  try {
    const items = getRecentItems();
    const filtered = items.filter(i => !(i.id === item.id && i.type === item.type));
    const updated = [
      { ...item, accessedAt: Date.now() },
      ...filtered
    ].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
}

const activityTypeLabels: Record<string, string> = {
  task: 'Tarefa',
  call: 'Ligação',
  meeting: 'Reunião',
  email: 'Email',
  deadline: 'Prazo',
};

const highlightMatch = (text: string | null | undefined, query: string): React.ReactNode => {
  if (!query || query.length < 2 || !text) return text || '';
  
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-400/40 text-inherit rounded-sm px-0.5">{part}</mark>
    ) : part
  );
};

const categories: Array<{
  id: SearchCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { id: 'all', label: 'Todas', icon: Search, color: 'text-foreground' },
  { id: 'organizations', label: 'Organizações', icon: Building2, color: 'text-primary' },
  { id: 'people', label: 'Pessoas', icon: Users, color: 'text-emerald-500' },
  { id: 'deals', label: 'Negócios', icon: Briefcase, color: 'text-amber-500' },
  { id: 'activities', label: 'Atividades', icon: CheckSquare, color: 'text-blue-500' },
  { id: 'notes', label: 'Anotações', icon: FileText, color: 'text-orange-500' },
];

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  if (isPast(date)) return 'Atrasada';
  return format(date, 'dd/MM', { locale: ptBR });
}

export function GlobalSearch({ collapsed, variant = 'sidebar' }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const navigate = useNavigate();

  // Keyboard shortcut (Ctrl+K / ⌘K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Reset search and filter when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setActiveCategory('all');
    }
  }, [open]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: async () => {
      const query = `%${searchQuery}%`;

      const [
        orgsResult,
        peopleResult,
        dealsResult,
        activitiesResult,
        dealNotesResult,
        peopleNotesResult,
        orgNotesResult,
      ] = await Promise.all([
        // Organizations
        supabase
          .from('organizations')
          .select('id, name, cnpj, email, phone, address_street, address_city')
          .or(`name.ilike.${query},cnpj.ilike.${query},email.ilike.${query},phone.ilike.${query}`)
          .limit(5),
        // People with organization
        supabase
          .from('people')
          .select(`
            id, name, email, phone, cpf,
            organization:organizations!people_organization_id_fkey(id, name)
          `)
          .or(`name.ilike.${query},email.ilike.${query},phone.ilike.${query},cpf.ilike.${query}`)
          .limit(5),
        // Deals with organization and person
        supabase
          .from('deals')
          .select(`
            id, title, policy_number, value, status,
            organization:organizations(id, name),
            person:people(id, name)
          `)
          .or(`title.ilike.${query},policy_number.ilike.${query}`)
          .limit(5),
        // Activities
        supabase
          .from('activities')
          .select('id, title, description, activity_type, due_date, deal_id, person_id, organization_id')
          .or(`title.ilike.${query},description.ilike.${query}`)
          .limit(5),
        // Deal notes
        supabase
          .from('deal_notes')
          .select('id, content, deal_id')
          .ilike('content', query)
          .limit(3),
        // People notes
        supabase
          .from('people_notes')
          .select('id, content, person_id')
          .ilike('content', query)
          .limit(3),
        // Organization notes
        supabase
          .from('organization_notes')
          .select('id, content, organization_id')
          .ilike('content', query)
          .limit(3),
      ]);

      // Fetch related entity names for notes
      const dealIds = dealNotesResult.data?.map(n => n.deal_id) || [];
      const personIds = peopleNotesResult.data?.map(n => n.person_id) || [];
      const orgIds = orgNotesResult.data?.map(n => n.organization_id) || [];

      const [dealsForNotes, peopleForNotes, orgsForNotes] = await Promise.all([
        dealIds.length > 0 
          ? supabase.from('deals').select('id, title').in('id', dealIds)
          : { data: [] },
        personIds.length > 0 
          ? supabase.from('people').select('id, name').in('id', personIds)
          : { data: [] },
        orgIds.length > 0 
          ? supabase.from('organizations').select('id, name').in('id', orgIds)
          : { data: [] },
      ]);

      // Map notes with entity names
      const dealNotesWithNames = (dealNotesResult.data || []).map(note => ({
        ...note,
        type: 'deal' as const,
        entityName: dealsForNotes.data?.find(d => d.id === note.deal_id)?.title || 'Negócio',
      }));

      const peopleNotesWithNames = (peopleNotesResult.data || []).map(note => ({
        ...note,
        type: 'person' as const,
        entityName: peopleForNotes.data?.find(p => p.id === note.person_id)?.name || 'Pessoa',
      }));

      const orgNotesWithNames = (orgNotesResult.data || []).map(note => ({
        ...note,
        type: 'organization' as const,
        entityName: orgsForNotes.data?.find(o => o.id === note.organization_id)?.name || 'Organização',
      }));

      return {
        organizations: orgsResult.data || [],
        people: peopleResult.data || [],
        deals: dealsResult.data || [],
        activities: activitiesResult.data || [],
        notes: [...dealNotesWithNames, ...peopleNotesWithNames, ...orgNotesWithNames],
      };
    },
    enabled: searchQuery.length >= 2,
  });

  const hasResults = results && (
    results.organizations.length > 0 ||
    results.people.length > 0 ||
    results.deals.length > 0 ||
    results.activities.length > 0 ||
    results.notes.length > 0
  );

  const getCategoryCounts = () => {
    if (!results) return { all: 0, organizations: 0, people: 0, deals: 0, activities: 0, notes: 0 };
    return {
      all: results.organizations.length + results.people.length + 
           results.deals.length + results.activities.length + results.notes.length,
      organizations: results.organizations.length,
      people: results.people.length,
      deals: results.deals.length,
      activities: results.activities.length,
      notes: results.notes.length,
    };
  };

  const handleSelect = (path: string, itemInfo?: {
    id: string;
    name: string;
    type: 'organization' | 'person' | 'deal';
    subtitle?: string;
  }) => {
    if (itemInfo) {
      addRecentItem({
        id: itemInfo.id,
        name: itemInfo.name,
        type: itemInfo.type,
        url: path,
        subtitle: itemInfo.subtitle,
      });
    }
    navigate(path);
    setOpen(false);
  };

  const formatValue = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderCategoryFilters = () => {
    const counts = getCategoryCounts();
    
    return (
      <div className="w-44 border-r border-border p-3 space-y-1 shrink-0 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
          Filtrar por
        </p>
        {categories.map((category) => {
          const Icon = category.icon;
          const count = counts[category.id] || 0;
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                isActive 
                  ? 'bg-accent text-accent-foreground font-medium' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', category.color)} />
              <span className="flex-1 text-left truncate">{category.label}</span>
              {searchQuery.length >= 2 && (
                <span className={cn(
                  'text-xs tabular-nums',
                  isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const getRecentIcon = (type: string) => {
    switch (type) {
      case 'organization': return <Building2 className="h-4 w-4 text-primary" />;
      case 'person': return <Users className="h-4 w-4 text-emerald-500" />;
      case 'deal': return <Briefcase className="h-4 w-4 text-amber-500" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const renderRecentItems = () => {
    const recentItems = getRecentItems();
    
    if (recentItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/50" />
          <span className="text-sm text-muted-foreground">Nenhum item acessado recentemente</span>
          <span className="text-xs text-muted-foreground/70">
            Digite para buscar organizações, pessoas e negócios
          </span>
        </div>
      );
    }
    
    return (
      <CommandGroup heading="Acessados recentemente">
        {recentItems.map((item) => (
          <CommandItem
            key={`recent-${item.type}-${item.id}`}
            value={`recent-${item.type}-${item.id}`}
            onSelect={() => handleSelect(item.url, {
              id: item.id,
              name: item.name,
              type: item.type,
              subtitle: item.subtitle,
            })}
            className="cursor-pointer"
          >
            <div className="mr-2 shrink-0">{getRecentIcon(item.type)}</div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate font-medium">{item.name}</span>
              {item.subtitle && (
                <span className="text-xs text-muted-foreground truncate">
                  {item.subtitle}
                </span>
              )}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };

  const renderSearchResults = () => {
    // Se não digitou nada, mostrar recentes
    if (searchQuery.length < 2) {
      return renderRecentItems();
    }

    const showOrganizations = activeCategory === 'all' || activeCategory === 'organizations';
    const showPeople = activeCategory === 'all' || activeCategory === 'people';
    const showDeals = activeCategory === 'all' || activeCategory === 'deals';
    const showActivities = activeCategory === 'all' || activeCategory === 'activities';
    const showNotes = activeCategory === 'all' || activeCategory === 'notes';
    return (
    <>
      {isLoading && (
        <div className="py-6 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}

      {!isLoading && !hasResults && (
        <CommandEmpty>
          Nenhum resultado encontrado para "{searchQuery}"
        </CommandEmpty>
      )}

      {/* Organizations */}
      {showOrganizations && results?.organizations && results.organizations.length > 0 && (
        <CommandGroup heading="Organizações">
          {results.organizations.map((org) => (
            <CommandItem
              key={org.id}
              value={`org-${org.id}`}
              onSelect={() => handleSelect(`/organizations/${org.id}`, {
                id: org.id,
                name: org.name,
                type: 'organization',
                subtitle: org.cnpj || org.email || undefined,
              })}
              className="cursor-pointer"
            >
              <Building2 className="mr-2 h-4 w-4 text-primary shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate font-medium">{highlightMatch(org.name, searchQuery)}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {org.cnpj && <>{highlightMatch(org.cnpj, searchQuery)} · </>}
                  {org.email && <>{highlightMatch(org.email, searchQuery)}</>}
                  {!org.cnpj && !org.email && 'Sem informações adicionais'}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {/* People */}
      {showPeople && results?.people && results.people.length > 0 && (
        <CommandGroup heading="Pessoas">
          {results.people.map((person) => (
            <CommandItem
              key={person.id}
              value={`person-${person.id}`}
              onSelect={() => handleSelect(`/people/${person.id}`, {
                id: person.id,
                name: person.name,
                type: 'person',
                subtitle: person.organization?.name || person.email || undefined,
              })}
              className="cursor-pointer"
            >
              <Users className="mr-2 h-4 w-4 text-emerald-500 shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate font-medium">{highlightMatch(person.name, searchQuery)}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {person.organization?.name && <>{person.organization.name} · </>}
                  {person.email && <>{highlightMatch(person.email, searchQuery)} · </>}
                  {person.phone && <>{highlightMatch(person.phone, searchQuery)}</>}
                  {!person.organization?.name && !person.email && !person.phone && 'Sem informações adicionais'}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {/* Deals */}
      {showDeals && results?.deals && results.deals.length > 0 && (
        <CommandGroup heading="Negócios">
          {results.deals.map((deal) => (
            <CommandItem
              key={deal.id}
              value={`deal-${deal.id}`}
              onSelect={() => handleSelect(`/deals/${deal.id}`, {
                id: deal.id,
                name: deal.title,
                type: 'deal',
                subtitle: deal.person?.name || deal.organization?.name || undefined,
              })}
              className="cursor-pointer"
            >
              <Briefcase className="mr-2 h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate font-medium">{highlightMatch(deal.title, searchQuery)}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {deal.person?.name && <>{deal.person.name} · </>}
                  {deal.organization?.name && <>{deal.organization.name} · </>}
                  {deal.value && <>{formatValue(deal.value)} · </>}
                  {deal.policy_number && <>Apólice: {highlightMatch(deal.policy_number, searchQuery)}</>}
                  {!deal.person?.name && !deal.organization?.name && !deal.value && !deal.policy_number && 'Sem informações adicionais'}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {/* Activities */}
      {showActivities && results?.activities && results.activities.length > 0 && (
        <CommandGroup heading="Atividades">
          {results.activities.map((activity) => (
            <CommandItem
              key={activity.id}
              value={`activity-${activity.id}`}
              onSelect={() => {
                if (activity.deal_id) {
                  handleSelect(`/deals/${activity.deal_id}`);
                } else if (activity.person_id) {
                  handleSelect(`/people/${activity.person_id}`);
                } else if (activity.organization_id) {
                  handleSelect(`/organizations/${activity.organization_id}`);
                } else {
                  handleSelect('/activities');
                }
              }}
              className="cursor-pointer"
            >
              <CheckSquare className="mr-2 h-4 w-4 text-blue-500 shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate font-medium">{highlightMatch(activity.title, searchQuery)}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {activityTypeLabels[activity.activity_type] || activity.activity_type} · {formatDueDate(activity.due_date)}
                  {activity.description && <> · {highlightMatch(truncateText(activity.description, 40), searchQuery)}</>}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {/* Notes */}
      {showNotes && results?.notes && results.notes.length > 0 && (
        <CommandGroup heading="Anotações">
          {results.notes.map((note) => (
            <CommandItem
              key={`${note.type}-note-${note.id}`}
              value={`note-${note.type}-${note.id}`}
              onSelect={() => {
                if (note.type === 'deal') {
                  handleSelect(`/deals/${note.deal_id}`);
                } else if (note.type === 'person') {
                  handleSelect(`/people/${note.person_id}`);
                } else {
                  handleSelect(`/organizations/${note.organization_id}`);
                }
              }}
              className="cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4 text-orange-500 shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate font-medium text-xs text-muted-foreground">
                  Anotação em: {note.entityName}
                </span>
                <span className="text-xs truncate">
                  "{highlightMatch(truncateText(note.content, 70), searchQuery)}"
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </>
  );
  };

  // Topbar variant - full width search bar
  if (variant === 'topbar') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/30',
            'flex items-center gap-3 text-muted-foreground',
            'hover:bg-muted/50 hover:border-border transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50'
          )}
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left text-sm">Buscar por nome, CNPJ, email, atividades...</span>
          <kbd className="text-[10px] bg-background/80 px-2 py-1 rounded-md font-mono border border-border/50">⌘K</kbd>
        </button>

        <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome, email, telefone, CNPJ, CPF, atividades, anotações..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <div className="flex min-h-[300px]">
            {renderCategoryFilters()}
            <CommandList className="max-h-[400px] flex-1">
              {renderSearchResults()}
            </CommandList>
          </div>
        </CommandDialog>
      </>
    );
  }

  // Sidebar variant (original)
  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'w-full justify-start text-muted-foreground hover:text-foreground border-border/50 bg-background/50 hover:bg-accent/50',
          collapsed ? 'px-2 justify-center' : 'px-3'
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        {!collapsed && (
          <>
            <span className="ml-2 flex-1 text-left text-sm">Buscar no CRM...</span>
            <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </>
        )}
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Buscar por nome, email, telefone, CNPJ, CPF, atividades, anotações..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <div className="flex min-h-[300px]">
          {renderCategoryFilters()}
          <CommandList className="max-h-[400px] flex-1">
            {renderSearchResults()}
          </CommandList>
        </div>
      </CommandDialog>
    </>
  );
}
