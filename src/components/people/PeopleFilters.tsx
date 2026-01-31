import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, X, Calendar, ChevronDown, ChevronUp, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const LABELS = [
  { value: 'Quente', color: 'bg-red-500' },
  { value: 'Morno', color: 'bg-yellow-500' },
  { value: 'Frio', color: 'bg-blue-500' },
];

export interface PeopleFiltersState {
  labels: string[];
  leadSources: string[];
  jobTitles: string[];
  organizationId: string | null;
  ownerId: string | null;
  dateRange: { from: Date | null; to: Date | null };
  hasEmail: boolean | null;
  hasPhone: boolean | null;
}

export const defaultPeopleFilters: PeopleFiltersState = {
  labels: [],
  leadSources: [],
  jobTitles: [],
  organizationId: null,
  ownerId: null,
  dateRange: { from: null, to: null },
  hasEmail: null,
  hasPhone: null,
};

interface PeopleFiltersProps {
  filters: PeopleFiltersState;
  onFiltersChange: (filters: PeopleFiltersState) => void;
  people: any[];
}

export function PeopleFilters({ filters, onFiltersChange, people }: PeopleFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch profiles for owner filter
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, user_id')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch organizations for filter
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Extract unique lead sources from people data
  const uniqueLeadSources = [...new Set(people.map((p) => p.lead_source).filter(Boolean))].sort();

  // Extract unique job titles from people data
  const uniqueJobTitles = [...new Set(people.map((p) => p.job_title).filter(Boolean))].sort();

  // Count active filters
  const activeFiltersCount =
    filters.labels.length +
    filters.leadSources.length +
    filters.jobTitles.length +
    (filters.organizationId ? 1 : 0) +
    (filters.ownerId ? 1 : 0) +
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
    (filters.hasEmail !== null ? 1 : 0) +
    (filters.hasPhone !== null ? 1 : 0);

  const handleLabelToggle = (label: string) => {
    const newLabels = filters.labels.includes(label)
      ? filters.labels.filter((l) => l !== label)
      : [...filters.labels, label];
    onFiltersChange({ ...filters, labels: newLabels });
  };

  const handleLeadSourceToggle = (source: string) => {
    const newSources = filters.leadSources.includes(source)
      ? filters.leadSources.filter((s) => s !== source)
      : [...filters.leadSources, source];
    onFiltersChange({ ...filters, leadSources: newSources });
  };

  const handleJobTitleToggle = (title: string) => {
    const newTitles = filters.jobTitles.includes(title)
      ? filters.jobTitles.filter((t) => t !== title)
      : [...filters.jobTitles, title];
    onFiltersChange({ ...filters, jobTitles: newTitles });
  };

  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const handleOwnerChange = (userId: string | null) => {
    onFiltersChange({ ...filters, ownerId: userId });
  };

  const handleOrganizationChange = (orgId: string | null) => {
    onFiltersChange({ ...filters, organizationId: orgId });
  };

  const handleHasEmailChange = (value: boolean | null) => {
    onFiltersChange({ ...filters, hasEmail: value });
  };

  const handleHasPhoneChange = (value: boolean | null) => {
    onFiltersChange({ ...filters, hasPhone: value });
  };

  const clearAllFilters = () => {
    onFiltersChange(defaultPeopleFilters);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2 flex-wrap">
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "gap-2 border-border/50 bg-card/50 backdrop-blur-sm",
              "hover:bg-card/80 hover:border-primary/30",
              activeFiltersCount > 0 && "border-primary/30 bg-primary/5"
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-1 h-5 px-1.5 bg-primary/20 text-primary font-bold"
              >
                {activeFiltersCount}
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        {/* Quick filter badges when collapsed */}
        {!isOpen && activeFiltersCount > 0 && (
          <>
            {filters.labels.map((label) => (
              <Badge key={label} variant="secondary" className="gap-1">
                {label}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLabelToggle(label);
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.leadSources.map((source) => (
              <Badge key={source} variant="secondary" className="gap-1">
                {source}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLeadSourceToggle(source);
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.jobTitles.map((title) => (
              <Badge key={title} variant="secondary" className="gap-1">
                {title}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJobTitleToggle(title);
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {(filters.dateRange.from || filters.dateRange.to) && (
              <Badge variant="secondary" className="gap-1">
                Período
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDateRangeChange({ from: null, to: null });
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.ownerId && (
              <Badge variant="secondary" className="gap-1">
                Responsável
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOwnerChange(null);
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.organizationId && (
              <Badge variant="secondary" className="gap-1">
                Organização
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOrganizationChange(null);
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.hasEmail !== null && (
              <Badge variant="secondary" className="gap-1">
                {filters.hasEmail ? 'Com Email' : 'Sem Email'}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHasEmailChange(null);
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.hasPhone !== null && (
              <Badge variant="secondary" className="gap-1">
                {filters.hasPhone ? 'Com Telefone' : 'Sem Telefone'}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHasPhoneChange(null);
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Limpar tudo
            </Button>
          </>
        )}
      </div>

      <CollapsibleContent>
        <div className="mt-4 p-5 rounded-xl border border-white/[0.08] bg-card/50 backdrop-blur-xl space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Label Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.labels.length > 0
                      ? `${filters.labels.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-1">
                    {LABELS.map(({ value, color }) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.labels.includes(value)}
                          onCheckedChange={() => handleLabelToggle(value)}
                        />
                        <span className={cn('w-3 h-3 rounded-full', color)} />
                        <span className="text-sm">{value}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Lead Source Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Origem do Lead</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.leadSources.length > 0
                      ? `${filters.leadSources.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {uniqueLeadSources.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhuma origem encontrada</p>
                    ) : (
                      uniqueLeadSources.map((source) => (
                        <label
                          key={source}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={filters.leadSources.includes(source)}
                            onCheckedChange={() => handleLeadSourceToggle(source)}
                          />
                          <span className="text-sm">{source}</span>
                        </label>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Job Title Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cargo</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.jobTitles.length > 0
                      ? `${filters.jobTitles.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {uniqueJobTitles.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhum cargo encontrado</p>
                    ) : (
                      uniqueJobTitles.map((title) => (
                        <label
                          key={title}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={filters.jobTitles.includes(title)}
                            onCheckedChange={() => handleJobTitleToggle(title)}
                          />
                          <span className="text-sm">{title}</span>
                        </label>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Owner Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsável</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.ownerId
                      ? profiles.find((p) => p.user_id === filters.ownerId)?.full_name ||
                        'Selecionado'
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        !filters.ownerId && 'bg-muted'
                      )}
                      onClick={() => handleOwnerChange(null)}
                    >
                      Todos
                    </button>
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        className={cn(
                          'w-full text-left p-2 rounded text-sm hover:bg-muted',
                          filters.ownerId === profile.user_id && 'bg-muted'
                        )}
                        onClick={() => handleOwnerChange(profile.user_id)}
                      >
                        {profile.full_name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Organization Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Organização</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.organizationId
                      ? organizations.find((o) => o.id === filters.organizationId)?.name ||
                        'Selecionada'
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 max-h-60 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        !filters.organizationId && 'bg-muted'
                      )}
                      onClick={() => handleOrganizationChange(null)}
                    >
                      Todas
                    </button>
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        className={cn(
                          'w-full text-left p-2 rounded text-sm hover:bg-muted truncate',
                          filters.organizationId === org.id && 'bg-muted'
                        )}
                        onClick={() => handleOrganizationChange(org.id)}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período (Criação)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.dateRange.from || filters.dateRange.to ? (
                      <span className="truncate">
                        {filters.dateRange.from
                          ? format(filters.dateRange.from, 'dd/MM/yy', { locale: ptBR })
                          : '...'}
                        {' - '}
                        {filters.dateRange.to
                          ? format(filters.dateRange.to, 'dd/MM/yy', { locale: ptBR })
                          : '...'}
                      </span>
                    ) : (
                      'Selecionar...'
                    )}
                    <Calendar className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{
                      from: filters.dateRange.from || undefined,
                      to: filters.dateRange.to || undefined,
                    }}
                    onSelect={(range) =>
                      handleDateRangeChange({
                        from: range?.from || null,
                        to: range?.to || null,
                      })
                    }
                    numberOfMonths={2}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Has Email Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tem Email</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.hasEmail === null
                      ? 'Todos'
                      : filters.hasEmail
                      ? 'Com Email'
                      : 'Sem Email'}
                    <Mail className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2" align="start">
                  <div className="space-y-1">
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasEmail === null && 'bg-muted'
                      )}
                      onClick={() => handleHasEmailChange(null)}
                    >
                      Todos
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasEmail === true && 'bg-muted'
                      )}
                      onClick={() => handleHasEmailChange(true)}
                    >
                      Com Email
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasEmail === false && 'bg-muted'
                      )}
                      onClick={() => handleHasEmailChange(false)}
                    >
                      Sem Email
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Has Phone Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tem Telefone</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.hasPhone === null
                      ? 'Todos'
                      : filters.hasPhone
                      ? 'Com Telefone'
                      : 'Sem Telefone'}
                    <Phone className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2" align="start">
                  <div className="space-y-1">
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasPhone === null && 'bg-muted'
                      )}
                      onClick={() => handleHasPhoneChange(null)}
                    >
                      Todos
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasPhone === true && 'bg-muted'
                      )}
                      onClick={() => handleHasPhoneChange(true)}
                    >
                      Com Telefone
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasPhone === false && 'bg-muted'
                      )}
                      onClick={() => handleHasPhoneChange(false)}
                    >
                      Sem Telefone
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex justify-end pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar todos os filtros
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
