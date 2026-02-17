import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  VisibilityState,
  RowSelectionState,
  Column,
} from '@tanstack/react-table';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Phone, Mail, Building2, Pencil, Trash2, GripVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowUpDown, Settings2, Eye, RotateCcw, Trash2 as Trash2Icon, MessageCircle, GitMerge, Loader2, User, Send, Bookmark } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCnpj } from '@/lib/utils';
import { ExportButtons } from '@/components/shared/ExportButtons';
import type { ExportColumn } from '@/lib/export';
import { useIsMobile } from '@/hooks/use-mobile';
import { PeopleMobileList } from './PeopleMobileList';
import { PersonTagBadge } from './PersonTagBadge';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface PersonWithOrg extends Person {
  organizations?: {
    id: string;
    name: string;
    cnpj: string | null;
    address_city: string | null;
    address_state: string | null;
    automotores: number | null;
  } | null;
  owner?: {
    id: string;
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface PeopleTableProps {
  people: PersonWithOrg[];
  isAdmin: boolean;
  onEdit: (person: PersonWithOrg) => void;
  onDelete: (person: PersonWithOrg) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onBulkDelete?: () => void;
  onMerge?: () => void;
  onBulkEmail?: () => void;
  onBulkEmailAll?: () => void;
  onSaveToCampaign?: () => void;
  onSaveToCampaignAll?: () => void;
  hasActiveFilters?: boolean;
  isLoadingFilteredRecipients?: boolean;
  // Server-side pagination props
  totalCount?: number;
  pageCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isFetching?: boolean;
}

const STORAGE_KEY = 'people-table-column-order';
const COLUMN_VISIBILITY_KEY = 'people-table-column-visibility';

const columnLabels: Record<string, string> = {
  name: 'Nome',
  phone: 'Telefone',
  whatsapp: 'WhatsApp',
  email: 'Email',
  capturedBy: 'Captado por',
  organization: 'Empresa',
  cnpj: 'CNPJ',
  city: 'Cidade',
  automotores: 'Automotores',
  job_title: 'Cargo',
  label: 'Status',
  tags: 'Etiquetas',
  actions: 'Ações',
};

const getLabelStyles = (label: string | null) => {
  switch (label) {
    case 'Quente':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'Morno':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'Frio':
      return 'bg-info/10 text-info border-info/20';
    default:
      return '';
  }
};

function SortableHeader({ column, title }: { column: Column<PersonWithOrg>; title: string }) {
  const sorted = column.getIsSorted();
  
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="h-auto p-0 font-semibold hover:bg-transparent text-xs uppercase tracking-wider w-full justify-center"
    >
      {title}
      {sorted === 'asc' ? (
        <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
      ) : (
        <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
      )}
    </Button>
  );
}

export function PeopleTable({ 
  people, 
  isAdmin, 
  onEdit, 
  onDelete, 
  selectedIds = [], 
  onSelectionChange, 
  onBulkDelete, 
  onMerge,
  onBulkEmail,
  onBulkEmailAll,
  onSaveToCampaign,
  onSaveToCampaignAll,
  hasActiveFilters = false,
  isLoadingFilteredRecipients = false,
  // Server-side pagination props
  totalCount = 0,
  pageCount = 1,
  currentPage = 0,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  isFetching = false,
}: PeopleTableProps) {
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Sync row selection -> parent (com comparação para evitar loop)
  useEffect(() => {
    const selectedRowIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    const currentSorted = [...selectedIds].sort().join(',');
    const newSorted = [...selectedRowIds].sort().join(',');
    if (currentSorted !== newSorted) {
      onSelectionChange?.(selectedRowIds);
    }
  }, [rowSelection]);

  // Sync parent -> row selection (com comparação para evitar loop)
  useEffect(() => {
    const currentSelectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    const currentSorted = [...currentSelectedIds].sort().join(',');
    const newSorted = [...selectedIds].sort().join(',');
    if (currentSorted !== newSorted) {
      const newSelection: RowSelectionState = {};
      selectedIds.forEach(id => { newSelection[id] = true; });
      setRowSelection(newSelection);
    }
  }, [selectedIds]);
  
  // Stable key for queries based on sorted person IDs
  const personIdsStableKey = useMemo(() => {
    const ids = people.map(p => p.id);
    ids.sort();
    return ids.join(',');
  }, [people]);

  // Fetch owner profiles separately to avoid blocking main data render
  const ownerIds = useMemo(() => 
    [...new Set(people.map(p => p.owner_id).filter(Boolean))] as string[],
    [people]
  );
  
  const { data: ownerProfiles = {} } = useQuery({
    queryKey: ['owner-profiles', ownerIds.sort().join(',')],
    queryFn: async () => {
      if (ownerIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url')
        .in('user_id', ownerIds);
      return Object.fromEntries((data || []).map(p => [p.user_id, p])) as Record<string, { id: string; user_id: string; full_name: string; avatar_url: string | null }>;
    },
    enabled: ownerIds.length > 0,
    staleTime: 60000, // Cache for 1 minute
  });

  // Map owner data to people for display
  const peopleWithOwners = useMemo(() => 
    people.map(person => ({
      ...person,
      owner: person.owner_id ? ownerProfiles[person.owner_id] || null : null,
    })),
    [people, ownerProfiles]
  );
  
  // Fetch all tag assignments for people in the list
  const { data: allTagAssignments = [] } = useQuery({
    queryKey: ['person-tag-assignments-bulk', personIdsStableKey],
    queryFn: async () => {
      const personIds = personIdsStableKey.split(',');
      if (personIds.length === 0 || personIds[0] === '') return [];
      
      const { data, error } = await supabase
        .from('person_tag_assignments')
        .select(`
          id,
          person_id,
          tag_id,
          tag:person_tags(id, name, color)
        `)
        .in('person_id', personIds);
      
      if (error) throw error;
      return data as { id: string; person_id: string; tag_id: string; tag: { id: string; name: string; color: string } }[];
    },
    enabled: people.length > 0,
    staleTime: 30000,
  });
  
  // Criar um mapa de pessoa -> tags
  const tagsByPersonId = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }[]>();
    allTagAssignments.forEach(assignment => {
      if (!map.has(assignment.person_id)) {
        map.set(assignment.person_id, []);
      }
      if (assignment.tag) {
        map.get(assignment.person_id)!.push(assignment.tag);
      }
    });
    return map;
  }, [allTagAssignments]);

  // Export columns configuration
  const exportColumns: ExportColumn[] = useMemo(() => [
    { id: 'name', label: 'Nome', accessor: (row: PersonWithOrg) => row.name },
    { id: 'cpf', label: 'CPF', accessor: (row: PersonWithOrg) => row.cpf },
    { id: 'phone', label: 'Telefone', accessor: (row: PersonWithOrg) => row.phone },
    { id: 'whatsapp', label: 'WhatsApp', accessor: (row: PersonWithOrg) => row.whatsapp },
    { id: 'email', label: 'Email', accessor: (row: PersonWithOrg) => row.email },
    { id: 'organization', label: 'Empresa', accessor: (row: PersonWithOrg) => row.organizations?.name },
    { id: 'cnpj', label: 'CNPJ', accessor: (row: PersonWithOrg) => row.organizations?.cnpj },
    { id: 'job_title', label: 'Cargo', accessor: (row: PersonWithOrg) => row.job_title },
    { id: 'city', label: 'Cidade', accessor: (row: PersonWithOrg) => 
      row.organizations?.address_city 
        ? `${row.organizations.address_city}/${row.organizations.address_state || ''}`
        : null
    },
    { id: 'automotores', label: 'Automotores', accessor: (row: PersonWithOrg) => row.organizations?.automotores },
    { id: 'label', label: 'Status', accessor: (row: PersonWithOrg) => row.label },
  ], []);

  // Flag para mostrar checkboxes de seleção
  const showSelection = onSelectionChange;

  const columns = useMemo<ColumnDef<PersonWithOrg>[]>(() => [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          {showSelection && (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Selecionar todos"
              className="translate-y-[2px]"
            />
          )}
          <SortableHeader column={column} title="Nome" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {showSelection && (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Selecionar linha"
              className="translate-y-[2px]"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <Link
            to={`/people/${row.original.id}`}
            className="font-medium hover:text-primary hover:underline transition-colors"
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      id: 'phone',
      accessorKey: 'phone',
      header: ({ column }) => <SortableHeader column={column} title="Telefone" />,
      cell: ({ row }) => {
        const phone = row.original.phone;
        if (!phone) return <span className="text-muted-foreground/50">-</span>;
        const cleanNumber = phone.replace(/\D/g, '');
        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            {phone}
            <a
              href={`https://wa.me/${cleanNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-emerald-500 hover:text-emerald-400"
              title="Abrir no WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          </span>
        );
      },
    },
    {
      id: 'whatsapp',
      accessorKey: 'whatsapp',
      header: ({ column }) => <SortableHeader column={column} title="WhatsApp" />,
      cell: ({ row }) => {
        const whatsapp = row.original.whatsapp;
        if (!whatsapp) return <span className="text-muted-foreground/50">-</span>;
        
        const cleanNumber = whatsapp.replace(/\D/g, '');
        
        return (
          <a
            href={`https://wa.me/${cleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-3 w-3" />
            {whatsapp}
          </a>
        );
      },
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: ({ column }) => <SortableHeader column={column} title="Email" />,
      cell: ({ row }) => (
        row.original.email ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" />
            {row.original.email}
          </span>
        ) : <span className="text-muted-foreground/50">-</span>
      ),
    },
    {
      id: 'capturedBy',
      accessorFn: (row) => row.owner?.full_name ?? '',
      header: ({ column }) => <SortableHeader column={column} title="Captado por" />,
      cell: ({ row }) => {
        const owner = row.original.owner;
        const leadSource = row.original.lead_source;
        
        // Only show badge for WhatsApp leads
        if (leadSource !== 'WhatsApp') {
          return <span className="text-muted-foreground/50">-</span>;
        }
        
        if (!owner) {
          return (
            <Badge variant="outline" className="bg-muted/50 text-muted-foreground text-xs">
              <MessageCircle className="h-3 w-3 mr-1" />
              Não atribuído
            </Badge>
          );
        }
        
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={owner.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(owner.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{owner.full_name}</span>
          </div>
        );
      },
    },
    {
      id: 'organization',
      accessorFn: (row) => row.organizations?.name ?? '',
      header: ({ column }) => <SortableHeader column={column} title="Empresa" />,
      cell: ({ row }) => (
        row.original.organizations ? (
          <Link
            to={`/organizations/${row.original.organizations.id}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" />
            {row.original.organizations.name}
          </Link>
        ) : <span className="text-muted-foreground/50">-</span>
      ),
    },
    {
      id: 'cnpj',
      accessorFn: (row) => row.organizations?.cnpj ?? '',
      header: ({ column }) => <SortableHeader column={column} title="CNPJ" />,
      cell: ({ row }) => (
        row.original.organizations?.cnpj ? (
          <span className="text-muted-foreground font-mono text-xs">
            {formatCnpj(row.original.organizations.cnpj)}
          </span>
        ) : <span className="text-muted-foreground/50">-</span>
      ),
    },
    {
      id: 'city',
      accessorFn: (row) => row.organizations?.address_city
        ? `${row.organizations.address_city}/${row.organizations.address_state || ''}`
        : '',
      header: ({ column }) => <SortableHeader column={column} title="Cidade" />,
      cell: ({ row }) => (
        row.original.organizations?.address_city ? (
          <span className="text-muted-foreground">
            {row.original.organizations.address_city}/{row.original.organizations.address_state || ''}
          </span>
        ) : <span className="text-muted-foreground/50">-</span>
      ),
    },
    {
      id: 'automotores',
      accessorFn: (row) => row.organizations?.automotores ?? null,
      header: ({ column }) => <SortableHeader column={column} title="Automotores" />,
      cell: ({ row }) => (
        row.original.organizations?.automotores != null ? (
          <span className="text-muted-foreground text-center block">
            {row.original.organizations.automotores}
          </span>
        ) : <span className="text-muted-foreground/50 text-center block">-</span>
      ),
    },
    {
      id: 'job_title',
      accessorKey: 'job_title',
      header: ({ column }) => <SortableHeader column={column} title="Cargo" />,
      cell: ({ row }) => (
        row.original.job_title ? (
          <span className="text-muted-foreground">{row.original.job_title}</span>
        ) : <span className="text-muted-foreground/50">-</span>
      ),
    },
    {
      id: 'label',
      accessorKey: 'label',
      header: ({ column }) => <SortableHeader column={column} title="Status" />,
      cell: ({ row }) => (
        row.original.label ? (
          <Badge variant="outline" className={getLabelStyles(row.original.label)}>
            {row.original.label}
          </Badge>
        ) : null
      ),
    },
    {
      id: 'tags',
      accessorFn: (row) => {
        const tags = tagsByPersonId.get(row.id) || [];
        return tags.map(t => t.name).join(', ');
      },
      header: 'Etiquetas',
      cell: ({ row }) => {
        const tags = tagsByPersonId.get(row.original.id) || [];
        if (tags.length === 0) return <span className="text-muted-foreground/50">-</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {tags.slice(0, 3).map(tag => (
              <PersonTagBadge key={tag.id} name={tag.name} color={tag.color} />
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(row.original)}
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(row.original)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [isAdmin, onEdit, onDelete, tagsByPersonId, showSelection]);

  // Usar diretamente columns (checkbox já está na coluna name)
  const allColumns = columns;

  const defaultColumnOrder = useMemo(() => columns.map(c => c.id as string), [columns]);

  useEffect(() => {
    if (columnOrder.length === 0) {
      setColumnOrder(defaultColumnOrder);
    }
  }, [defaultColumnOrder, columnOrder.length]);

  useEffect(() => {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const handleResetColumns = () => {
    setColumnVisibility({});
    setColumnOrder(defaultColumnOrder);
    localStorage.removeItem(COLUMN_VISIBILITY_KEY);
    localStorage.removeItem(STORAGE_KEY);
  };

  const table = useReactTable({
    data: peopleWithOwners,
    columns: allColumns,
    state: {
      sorting,
      columnOrder: columnOrder.length > 0 ? columnOrder : defaultColumnOrder,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Manual pagination - data is already paginated from server
    manualPagination: true,
    pageCount: pageCount,
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    const currentOrder = columnOrder.length > 0 ? [...columnOrder] : [...defaultColumnOrder];

    // Don't allow dragging actions column
    const draggedColumn = currentOrder[sourceIndex];
    if (draggedColumn === 'actions') return;

    // Don't allow dropping after actions column
    if (currentOrder[destinationIndex] === 'actions') return;

    const [removed] = currentOrder.splice(sourceIndex, 1);
    currentOrder.splice(destinationIndex, 0, removed);

    setColumnOrder(currentOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOrder));
  };

  // Mobile view
  if (isMobile) {
    return (
      <PeopleMobileList 
        people={people} 
        isAdmin={isAdmin} 
        onEdit={onEdit} 
        onDelete={onDelete}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        onBulkDelete={onBulkDelete}
      />
    );
  }

  // Calculate display range for pagination info
  const startIndex = currentPage * pageSize + 1;
  const endIndex = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/30 relative">
      {/* Loading overlay when fetching */}
      {isFetching && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Barra de ferramentas */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
        <div className="flex items-center gap-4">
          <ExportButtons 
            data={people} 
            columns={exportColumns} 
            filenamePrefix="pessoas" 
          />
          
          {/* Ações para todos filtrados */}
          {hasActiveFilters && totalCount > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkEmailAll}
                disabled={isLoadingFilteredRecipients}
                className="h-8"
              >
                {isLoadingFilteredRecipients ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                Enviar para {totalCount} filtrados
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveToCampaignAll}
                disabled={isLoadingFilteredRecipients}
                className="h-8"
              >
                <Bookmark className="h-4 w-4 mr-1.5" />
                Salvar em Campanha
              </Button>
            </div>
          )}

          {/* Ações em lote - aparece quando há seleção */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 pl-4 border-l">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selecionada(s)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkEmail}
                className="h-8"
              >
                <Send className="h-4 w-4 mr-1.5" />
                E-mail em Massa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveToCampaign}
                className="h-8"
              >
                <Bookmark className="h-4 w-4 mr-1.5" />
                Salvar em Campanha
              </Button>
              {selectedIds.length === 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMerge}
                  className="h-8"
                >
                  <GitMerge className="h-4 w-4 mr-1.5" />
                  Mesclar
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBulkDelete}
                  className="h-8"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Excluir
                </Button>
              )}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Colunas</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border border-border z-50">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visibilidade das Colunas
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.getAllLeafColumns()
              .filter(column => column.id !== 'actions')
              .map(column => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  className="cursor-pointer"
                >
                  {columnLabels[column.id] || column.id}
                </DropdownMenuCheckboxItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              onSelect={handleResetColumns}
              className="cursor-pointer text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar padrão
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader>
            <Droppable droppableId="columns" direction="horizontal">
              {(provided) => (
                <TableRow
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="hover:bg-transparent"
                >
                  {table.getHeaderGroups()[0].headers.map((header, index) => (
                    <Draggable
                      key={header.id}
                      draggableId={header.id}
                      index={index}
                      isDragDisabled={header.id === 'actions'}
                    >
                      {(provided, snapshot) => (
                        <TableHead
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`text-center ${snapshot.isDragging ? 'bg-muted/50' : ''} ${
                            header.id === 'automotores' ? 'text-center' : ''
                          }`}
                          style={provided.draggableProps.style}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing"
                          >
                            {header.id !== 'actions' && (
                              <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                            )}
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        </TableHead>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableRow>
              )}
            </Droppable>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DragDropContext>
      
      {/* Pagination Controls - Server-side */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {totalCount === 0 ? 0 : startIndex} a {endIndex} de {totalCount} registros
          </span>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens por página:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                onPageSizeChange?.(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-20 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(0)}
            disabled={currentPage === 0}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="px-3 text-sm text-muted-foreground">
            Página {currentPage + 1} de {pageCount}
          </span>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(pageCount - 1)}
            disabled={currentPage >= pageCount - 1}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
