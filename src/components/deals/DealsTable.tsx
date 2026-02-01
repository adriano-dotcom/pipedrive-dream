import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Pencil, Trash2, Eye, Building2, User, Flame, Thermometer, Snowflake, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ExportButtons } from '@/components/shared/ExportButtons';
import type { ExportColumn } from '@/lib/export';

interface Deal {
  id: string;
  title: string;
  value: number;
  stage_id: string | null;
  pipeline_id: string;
  organization_id: string | null;
  person_id: string | null;
  insurance_type: string | null;
  label: string | null;
  expected_close_date: string | null;
  status: string;
  created_at: string;
  owner_id: string | null;
  organization?: { id: string; name: string } | null;
  person?: { id: string; name: string } | null;
  stage?: { id: string; name: string; color: string } | null;
}

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface Profile {
  id: string;
  full_name: string;
  user_id: string;
}

interface DealsTableProps {
  deals: Deal[];
  stages: Stage[];
  profiles: Profile[];
  onEdit: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  isLoading?: boolean;
  // Server-side pagination props
  totalCount?: number;
  pageCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isFetching?: boolean;
}

const labelConfig = {
  hot: { label: 'Quente', icon: Flame, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  warm: { label: 'Morno', icon: Thermometer, className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  cold: { label: 'Frio', icon: Snowflake, className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const statusConfig = {
  open: { label: 'Aberto', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  won: { label: 'Ganho', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  lost: { label: 'Perdido', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const insuranceTypes: Record<string, string> = {
  auto: '🚗 Auto',
  life: '❤️ Vida',
  health: '🏥 Saúde',
  property: '🏠 Patrimonial',
  cargo: '📦 Carga',
  fleet: '🚛 Frota',
  liability: '⚖️ RC',
  other: '📋 Outros',
};

// Sortable header component
function SortableHeader({ column, title }: { column: Column<Deal>; title: string }) {
  const sorted = column.getIsSorted();
  
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="h-auto p-0 font-semibold hover:bg-transparent -ml-2 px-2"
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

export function DealsTable({
  deals,
  stages,
  profiles,
  onEdit,
  onDelete,
  isLoading,
  // Server-side pagination props
  totalCount = 0,
  pageCount = 1,
  currentPage = 0,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  isFetching = false,
}: DealsTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Check if server-side pagination is being used
  const useServerPagination = onPageChange !== undefined;

  // Export columns configuration
  const statusLabels: Record<string, string> = {
    open: 'Aberto',
    won: 'Ganho',
    lost: 'Perdido',
  };

  const labelLabels: Record<string, string> = {
    hot: 'Quente',
    warm: 'Morno',
    cold: 'Frio',
  };

  const exportColumns: ExportColumn[] = useMemo(() => [
    { id: 'title', label: 'Título', accessor: (row: Deal) => row.title },
    { id: 'value', label: 'Valor', accessor: (row: Deal) => 
      row.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.value) : null
    },
    { id: 'stage', label: 'Etapa', accessor: (row: Deal) => row.stage?.name },
    { id: 'status', label: 'Status', accessor: (row: Deal) => statusLabels[row.status] || row.status },
    { id: 'person', label: 'Pessoa', accessor: (row: Deal) => row.person?.name },
    { id: 'organization', label: 'Organização', accessor: (row: Deal) => row.organization?.name },
    { id: 'insurance_type', label: 'Tipo de Seguro', accessor: (row: Deal) => insuranceTypes[row.insurance_type || ''] || row.insurance_type },
    { id: 'label', label: 'Etiqueta', accessor: (row: Deal) => labelLabels[row.label || ''] || row.label },
    { id: 'created_at', label: 'Data Criação', accessor: (row: Deal) => 
      format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    },
    { id: 'expected_close_date', label: 'Previsão Fechamento', accessor: (row: Deal) => 
      row.expected_close_date ? format(new Date(row.expected_close_date), 'dd/MM/yyyy', { locale: ptBR }) : null
    },
  ], []);

  const columns = useMemo<ColumnDef<Deal>[]>(() => [
    {
      accessorKey: 'person',
      header: ({ column }) => <SortableHeader column={column} title="Pessoa de Contato" />,
      cell: ({ row }) => {
        const person = row.original.person;
        if (!person) return <span className="text-muted-foreground">-</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/people/${person.id}`);
                  }}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[150px]">{person.name}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Clique para ver detalhes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.person?.name || '';
        const b = rowB.original.person?.name || '';
        return a.localeCompare(b, 'pt-BR');
      },
      filterFn: (row, id, value) => {
        const person = row.original.person;
        if (!person) return false;
        return person.name.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      accessorKey: 'stage',
      header: ({ column }) => <SortableHeader column={column} title="Etapa" />,
      cell: ({ row }) => {
        const stage = row.original.stage;
        if (!stage) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge 
            variant="outline" 
            className="border"
            style={{ 
              borderColor: stage.color,
              backgroundColor: `${stage.color}20`,
              color: stage.color,
            }}
          >
            {stage.name}
          </Badge>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.stage?.name || '';
        const b = rowB.original.stage?.name || '';
        return a.localeCompare(b, 'pt-BR');
      },
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        return row.original.stage_id === value;
      },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => <SortableHeader column={column} title="Título" />,
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/deals/${row.original.id}`);
                }}
                className="font-medium hover:text-primary transition-colors truncate max-w-[200px] text-left"
              >
                {row.original.title}
              </button>
            </TooltipTrigger>
            <TooltipContent>Clique para ver detalhes</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'value',
      header: ({ column }) => <SortableHeader column={column} title="Valor" />,
      cell: ({ row }) => (
        <span className="font-semibold text-primary">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
          }).format(row.original.value || 0)}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <SortableHeader column={column} title="Criado em" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.original.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <SortableHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.original.status as keyof typeof statusConfig;
        const config = statusConfig[status] || statusConfig.open;
        return (
          <Badge variant="outline" className={cn("border", config.className)}>
            {config.label}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        return row.original.status === value;
      },
    },
    {
      accessorKey: 'organization',
      header: ({ column }) => <SortableHeader column={column} title="Organização" />,
      cell: ({ row }) => {
        const org = row.original.organization;
        if (!org) return <span className="text-muted-foreground">-</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/organizations/${org.id}`);
                  }}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[150px]">{org.name}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Clique para ver detalhes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.organization?.name || '';
        const b = rowB.original.organization?.name || '';
        return a.localeCompare(b, 'pt-BR');
      },
      filterFn: (row, id, value) => {
        const org = row.original.organization;
        if (!org) return false;
        return org.name.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      accessorKey: 'insurance_type',
      header: ({ column }) => <SortableHeader column={column} title="Tipo Seguro" />,
      cell: ({ row }) => {
        const type = row.original.insurance_type;
        if (!type) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="outline" className="bg-muted/50">
            {insuranceTypes[type] || type}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        return row.original.insurance_type === value;
      },
    },
    {
      accessorKey: 'label',
      header: ({ column }) => <SortableHeader column={column} title="Etiqueta" />,
      cell: ({ row }) => {
        const label = row.original.label as keyof typeof labelConfig;
        if (!label) return <span className="text-muted-foreground">-</span>;
        const config = labelConfig[label];
        if (!config) return <span className="text-muted-foreground">{label}</span>;
        const LabelIcon = config.icon;
        return (
          <Badge variant="outline" className={cn("border gap-1", config.className)}>
            <LabelIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        return row.original.label === value;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ios-glass-elevated">
            <DropdownMenuItem onClick={() => navigate(`/deals/${row.original.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [navigate, onEdit, onDelete]);

  const table = useReactTable({
    data: deals,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    // Manual pagination when using server-side
    manualPagination: useServerPagination,
    pageCount: useServerPagination ? pageCount : undefined,
  });

  const stageFilter = columnFilters.find(f => f.id === 'stage')?.value as string || 'all';
  const statusFilter = columnFilters.find(f => f.id === 'status')?.value as string || 'all';
  const labelFilter = columnFilters.find(f => f.id === 'label')?.value as string || 'all';
  const insuranceFilter = columnFilters.find(f => f.id === 'insurance_type')?.value as string || 'all';

  // Calculate display range for pagination info
  const startIndex = currentPage * pageSize + 1;
  const endIndex = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div className="space-y-4 relative">
      {/* Loading overlay when fetching */}
      {isFetching && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Filters and Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar negócios..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs"
          />
        
          <Select
            value={stageFilter}
            onValueChange={(value) => {
              if (value === 'all') {
                setColumnFilters(prev => prev.filter(f => f.id !== 'stage'));
              } else {
                setColumnFilters(prev => [
                  ...prev.filter(f => f.id !== 'stage'),
                  { id: 'stage', value }
                ]);
              }
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas etapas</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              if (value === 'all') {
                setColumnFilters(prev => prev.filter(f => f.id !== 'status'));
              } else {
                setColumnFilters(prev => [
                  ...prev.filter(f => f.id !== 'status'),
                  { id: 'status', value }
                ]);
              }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="won">Ganho</SelectItem>
              <SelectItem value="lost">Perdido</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={labelFilter}
            onValueChange={(value) => {
              if (value === 'all') {
                setColumnFilters(prev => prev.filter(f => f.id !== 'label'));
              } else {
                setColumnFilters(prev => [
                  ...prev.filter(f => f.id !== 'label'),
                  { id: 'label', value }
                ]);
              }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Etiqueta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas etiquetas</SelectItem>
              <SelectItem value="hot">🔥 Quente</SelectItem>
              <SelectItem value="warm">🌡️ Morno</SelectItem>
              <SelectItem value="cold">❄️ Frio</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={insuranceFilter}
            onValueChange={(value) => {
              if (value === 'all') {
                setColumnFilters(prev => prev.filter(f => f.id !== 'insurance_type'));
              } else {
                setColumnFilters(prev => [
                  ...prev.filter(f => f.id !== 'insurance_type'),
                  { id: 'insurance_type', value }
                ]);
              }
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo Seguro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {Object.entries(insuranceTypes).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <ExportButtons 
          data={deals} 
          columns={exportColumns} 
          filenamePrefix="negocios" 
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/deals/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? 'Carregando...' : 'Nenhum negócio encontrado.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Server-side or Client-side */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {useServerPagination 
              ? `Mostrando ${totalCount === 0 ? 0 : startIndex} a ${endIndex} de ${totalCount} negócio(s)`
              : `${table.getFilteredRowModel().rows.length} negócio(s)`
            }
          </span>
          
          {useServerPagination && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  onPageSizeChange?.(Number(value));
                }}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {useServerPagination ? (
            <>
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
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {table.getState().pagination.pageIndex + 1} de{' '}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
