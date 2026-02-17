import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, X, Calendar, ChevronDown, ChevronUp, FileText, AlertTriangle } from 'lucide-react';
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

const INSURANCE_BRANCHES = [
  'Carga',
  'Saúde',
  'Frota',
  'Vida',
  'Residencial',
  'Empresarial',
  'Automóvel',
  'RC',
];

const RISK_PROFILES = ['Baixo', 'Médio', 'Alto'];

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export interface OrganizationsFiltersState {
  labels: string[];
  cities: string[];
  states: string[];
  insuranceBranches: string[];
  currentInsurers: string[];
  riskProfiles: string[];
  fleetTypes: string[];
  renewalMonths: number[];
  ownerId: string | null;
  dateRange: { from: Date | null; to: Date | null };
  hasCnpj: boolean | null;
  hasClaimsHistory: boolean | null;
  enrichmentStatus: 'enriched' | 'not_enriched' | null;
}

export const defaultOrganizationsFilters: OrganizationsFiltersState = {
  labels: [],
  cities: [],
  states: [],
  insuranceBranches: [],
  currentInsurers: [],
  riskProfiles: [],
  fleetTypes: [],
  renewalMonths: [],
  ownerId: null,
  dateRange: { from: null, to: null },
  hasCnpj: null,
  hasClaimsHistory: null,
  enrichmentStatus: null,
};

interface OrganizationsFiltersProps {
  filters: OrganizationsFiltersState;
  onFiltersChange: (filters: OrganizationsFiltersState) => void;
  organizations: any[];
}

export function OrganizationsFilters({ filters, onFiltersChange, organizations }: OrganizationsFiltersProps) {
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

  // Extract unique cities from organizations data
  const uniqueCities = [...new Set(organizations.map((o) => o.address_city).filter(Boolean))].sort();

  // Extract unique current insurers from organizations data
  const uniqueInsurers = [...new Set(organizations.map((o) => o.current_insurer).filter(Boolean))].sort();

  // Extract unique fleet types from organizations data
  const uniqueFleetTypes = [...new Set(organizations.map((o) => o.fleet_type).filter(Boolean))].sort();

  // Count active filters
  const activeFiltersCount =
    filters.labels.length +
    filters.cities.length +
    filters.states.length +
    filters.insuranceBranches.length +
    filters.currentInsurers.length +
    filters.riskProfiles.length +
    filters.fleetTypes.length +
    filters.renewalMonths.length +
    (filters.ownerId ? 1 : 0) +
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
    (filters.hasCnpj !== null ? 1 : 0) +
    (filters.hasClaimsHistory !== null ? 1 : 0) +
    (filters.enrichmentStatus !== null ? 1 : 0);

  const handleLabelToggle = (label: string) => {
    const newLabels = filters.labels.includes(label)
      ? filters.labels.filter((l) => l !== label)
      : [...filters.labels, label];
    onFiltersChange({ ...filters, labels: newLabels });
  };

  const handleCityToggle = (city: string) => {
    const newCities = filters.cities.includes(city)
      ? filters.cities.filter((c) => c !== city)
      : [...filters.cities, city];
    onFiltersChange({ ...filters, cities: newCities });
  };

  const handleStateToggle = (state: string) => {
    const newStates = filters.states.includes(state)
      ? filters.states.filter((s) => s !== state)
      : [...filters.states, state];
    onFiltersChange({ ...filters, states: newStates });
  };

  const handleInsuranceBranchToggle = (branch: string) => {
    const newBranches = filters.insuranceBranches.includes(branch)
      ? filters.insuranceBranches.filter((b) => b !== branch)
      : [...filters.insuranceBranches, branch];
    onFiltersChange({ ...filters, insuranceBranches: newBranches });
  };

  const handleCurrentInsurerToggle = (insurer: string) => {
    const newInsurers = filters.currentInsurers.includes(insurer)
      ? filters.currentInsurers.filter((i) => i !== insurer)
      : [...filters.currentInsurers, insurer];
    onFiltersChange({ ...filters, currentInsurers: newInsurers });
  };

  const handleRiskProfileToggle = (profile: string) => {
    const newProfiles = filters.riskProfiles.includes(profile)
      ? filters.riskProfiles.filter((p) => p !== profile)
      : [...filters.riskProfiles, profile];
    onFiltersChange({ ...filters, riskProfiles: newProfiles });
  };

  const handleFleetTypeToggle = (type: string) => {
    const newTypes = filters.fleetTypes.includes(type)
      ? filters.fleetTypes.filter((t) => t !== type)
      : [...filters.fleetTypes, type];
    onFiltersChange({ ...filters, fleetTypes: newTypes });
  };

  const handleRenewalMonthToggle = (month: number) => {
    const newMonths = filters.renewalMonths.includes(month)
      ? filters.renewalMonths.filter((m) => m !== month)
      : [...filters.renewalMonths, month];
    onFiltersChange({ ...filters, renewalMonths: newMonths });
  };

  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const handleOwnerChange = (userId: string | null) => {
    onFiltersChange({ ...filters, ownerId: userId });
  };

  const handleHasCnpjChange = (value: boolean | null) => {
    onFiltersChange({ ...filters, hasCnpj: value });
  };

  const handleHasClaimsHistoryChange = (value: boolean | null) => {
    onFiltersChange({ ...filters, hasClaimsHistory: value });
  };

  const handleEnrichmentStatusChange = (value: 'enriched' | 'not_enriched' | null) => {
    onFiltersChange({ ...filters, enrichmentStatus: value });
  };

  const clearAllFilters = () => {
    onFiltersChange(defaultOrganizationsFilters);
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
            {filters.cities.slice(0, 2).map((city) => (
              <Badge key={city} variant="secondary" className="gap-1">
                {city}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCityToggle(city);
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.cities.length > 2 && (
              <Badge variant="secondary">+{filters.cities.length - 2} cidades</Badge>
            )}
            {filters.states.slice(0, 2).map((state) => (
              <Badge key={state} variant="secondary" className="gap-1">
                {state}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStateToggle(state);
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
            {activeFiltersCount > 4 && (
              <Badge variant="secondary">+{activeFiltersCount - 4} filtros</Badge>
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

            {/* City Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.cities.length > 0
                      ? `${filters.cities.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {uniqueCities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhuma cidade encontrada</p>
                    ) : (
                      uniqueCities.map((city) => (
                        <label
                          key={city}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={filters.cities.includes(city)}
                            onCheckedChange={() => handleCityToggle(city)}
                          />
                          <span className="text-sm">{city}</span>
                        </label>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* State Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.states.length > 0
                      ? `${filters.states.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {BRAZILIAN_STATES.map((state) => (
                      <label
                        key={state}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.states.includes(state)}
                          onCheckedChange={() => handleStateToggle(state)}
                        />
                        <span className="text-sm">{state}</span>
                      </label>
                    ))}
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

            {/* Insurance Branches Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ramos de Seguro</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.insuranceBranches.length > 0
                      ? `${filters.insuranceBranches.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-1">
                    {INSURANCE_BRANCHES.map((branch) => (
                      <label
                        key={branch}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.insuranceBranches.includes(branch)}
                          onCheckedChange={() => handleInsuranceBranchToggle(branch)}
                        />
                        <span className="text-sm">{branch}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Current Insurer Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Seguradora Atual</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.currentInsurers.length > 0
                      ? `${filters.currentInsurers.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {uniqueInsurers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhuma seguradora encontrada</p>
                    ) : (
                      uniqueInsurers.map((insurer) => (
                        <label
                          key={insurer}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={filters.currentInsurers.includes(insurer)}
                            onCheckedChange={() => handleCurrentInsurerToggle(insurer)}
                          />
                          <span className="text-sm">{insurer}</span>
                        </label>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Risk Profile Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Perfil de Risco</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.riskProfiles.length > 0
                      ? `${filters.riskProfiles.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-1">
                    {RISK_PROFILES.map((profile) => (
                      <label
                        key={profile}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.riskProfiles.includes(profile)}
                          onCheckedChange={() => handleRiskProfileToggle(profile)}
                        />
                        <span className="text-sm">{profile}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Renewal Month Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês de Renovação</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.renewalMonths.length > 0
                      ? `${filters.renewalMonths.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {MONTHS.map(({ value, label }) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.renewalMonths.includes(value)}
                          onCheckedChange={() => handleRenewalMonthToggle(value)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Fleet Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Frota</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.fleetTypes.length > 0
                      ? `${filters.fleetTypes.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {uniqueFleetTypes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhum tipo encontrado</p>
                    ) : (
                      uniqueFleetTypes.map((type) => (
                        <label
                          key={type}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={filters.fleetTypes.includes(type)}
                            onCheckedChange={() => handleFleetTypeToggle(type)}
                          />
                          <span className="text-sm">{type}</span>
                        </label>
                      ))
                    )}
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

            {/* Has CNPJ Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tem CNPJ</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.hasCnpj === null
                      ? 'Todos'
                      : filters.hasCnpj
                      ? 'Com CNPJ'
                      : 'Sem CNPJ'}
                    <FileText className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2" align="start">
                  <div className="space-y-1">
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasCnpj === null && 'bg-muted'
                      )}
                      onClick={() => handleHasCnpjChange(null)}
                    >
                      Todos
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasCnpj === true && 'bg-muted'
                      )}
                      onClick={() => handleHasCnpjChange(true)}
                    >
                      Com CNPJ
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasCnpj === false && 'bg-muted'
                      )}
                      onClick={() => handleHasCnpjChange(false)}
                    >
                      Sem CNPJ
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Has Claims History Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Histórico de Sinistros</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.hasClaimsHistory === null
                      ? 'Todos'
                      : filters.hasClaimsHistory
                      ? 'Com Sinistros'
                      : 'Sem Sinistros'}
                    <AlertTriangle className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2" align="start">
                  <div className="space-y-1">
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasClaimsHistory === null && 'bg-muted'
                      )}
                      onClick={() => handleHasClaimsHistoryChange(null)}
                    >
                      Todos
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasClaimsHistory === true && 'bg-muted'
                      )}
                      onClick={() => handleHasClaimsHistoryChange(true)}
                    >
                      Com Sinistros
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.hasClaimsHistory === false && 'bg-muted'
                      )}
                      onClick={() => handleHasClaimsHistoryChange(false)}
                    >
                      Sem Sinistros
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Enrichment Status (Atualizada RF) Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Atualizada RF</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.enrichmentStatus === null
                      ? 'Todas'
                      : filters.enrichmentStatus === 'enriched'
                      ? 'Atualizada'
                      : 'Não Atualizada'}
                    <FileText className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-1">
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.enrichmentStatus === null && 'bg-muted'
                      )}
                      onClick={() => handleEnrichmentStatusChange(null)}
                    >
                      Todas
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.enrichmentStatus === 'enriched' && 'bg-muted'
                      )}
                      onClick={() => handleEnrichmentStatusChange('enriched')}
                    >
                      Atualizada RF
                    </button>
                    <button
                      className={cn(
                        'w-full text-left p-2 rounded text-sm hover:bg-muted',
                        filters.enrichmentStatus === 'not_enriched' && 'bg-muted'
                      )}
                      onClick={() => handleEnrichmentStatusChange('not_enriched')}
                    >
                      Não Atualizada RF
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
