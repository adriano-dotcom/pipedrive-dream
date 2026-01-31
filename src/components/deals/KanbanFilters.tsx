import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, X, Calendar, ChevronDown, ChevronUp, Tag } from 'lucide-react';
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
import { useDealTags } from '@/hooks/useDealTags';
import { TagBadge } from '@/components/shared/TagBadge';

const INSURANCE_TYPES = [
  'Carga',
  'Saúde',
  'Frota',
  'Vida',
  'Residencial',
  'Empresarial',
  'Automóvel',
  'RC',
];

const LABELS = [
  { value: 'Quente', color: 'bg-red-500' },
  { value: 'Morno', color: 'bg-yellow-500' },
  { value: 'Frio', color: 'bg-blue-500' },
];

export interface KanbanFiltersState {
  insuranceTypes: string[];
  labels: string[];
  dateRange: { from: Date | null; to: Date | null };
  ownerId: string | null;
  tagIds: string[];
}

interface KanbanFiltersProps {
  filters: KanbanFiltersState;
  onFiltersChange: (filters: KanbanFiltersState) => void;
}

export function KanbanFilters({ filters, onFiltersChange }: KanbanFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch deal tags
  const { data: dealTags = [], isLoading: tagsLoading } = useDealTags();

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

  // Count active filters
  const activeFiltersCount =
    filters.insuranceTypes.length +
    filters.labels.length +
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
    (filters.ownerId ? 1 : 0) +
    (filters.tagIds?.length || 0);

  const handleInsuranceTypeToggle = (type: string) => {
    const newTypes = filters.insuranceTypes.includes(type)
      ? filters.insuranceTypes.filter((t) => t !== type)
      : [...filters.insuranceTypes, type];
    onFiltersChange({ ...filters, insuranceTypes: newTypes });
  };

  const handleLabelToggle = (label: string) => {
    const newLabels = filters.labels.includes(label)
      ? filters.labels.filter((l) => l !== label)
      : [...filters.labels, label];
    onFiltersChange({ ...filters, labels: newLabels });
  };

  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const handleOwnerChange = (userId: string | null) => {
    onFiltersChange({ ...filters, ownerId: userId });
  };

  const handleTagToggle = (tagId: string) => {
    const currentTagIds = filters.tagIds || [];
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter((t) => t !== tagId)
      : [...currentTagIds, tagId];
    onFiltersChange({ ...filters, tagIds: newTagIds });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      insuranceTypes: [],
      labels: [],
      dateRange: { from: null, to: null },
      ownerId: null,
      tagIds: [],
    });
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
            {filters.insuranceTypes.map((type) => (
              <Badge key={type} variant="secondary" className="gap-1">
                {type}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInsuranceTypeToggle(type);
                  }}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
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
            {(filters.tagIds || []).map((tagId) => {
              const tag = dealTags.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <TagBadge
                  key={tagId}
                  name={tag.name}
                  color={tag.color}
                  onRemove={() => handleTagToggle(tagId)}
                />
              );
            })}
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
            {/* Insurance Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Seguro</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.insuranceTypes.length > 0
                      ? `${filters.insuranceTypes.length} selecionado(s)`
                      : 'Selecionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-1">
                    {INSURANCE_TYPES.map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.insuranceTypes.includes(type)}
                          onCheckedChange={() => handleInsuranceTypeToggle(type)}
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Label Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Etiqueta</label>
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

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período (Fechamento)</label>
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
                <PopoverContent className="w-56 p-2" align="start">
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

            {/* Deal Tags Filter */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <label className="text-sm font-medium">Etiquetas do Negócio</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto justify-between gap-2">
                    <Tag className="h-4 w-4" />
                    {(filters.tagIds || []).length > 0
                      ? `${filters.tagIds.length} etiqueta(s)`
                      : 'Selecionar etiquetas...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {tagsLoading ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Carregando...
                      </div>
                    ) : dealTags.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhuma etiqueta criada
                      </div>
                    ) : (
                      dealTags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={(filters.tagIds || []).includes(tag.id)}
                            onCheckedChange={() => handleTagToggle(tag.id)}
                          />
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm truncate">{tag.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {/* Show selected tags inline */}
              {(filters.tagIds || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.tagIds.map((tagId) => {
                    const tag = dealTags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <TagBadge
                        key={tagId}
                        name={tag.name}
                        color={tag.color}
                        onRemove={() => handleTagToggle(tagId)}
                      />
                    );
                  })}
                </div>
              )}
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
