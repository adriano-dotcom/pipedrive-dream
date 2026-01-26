import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
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
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, Eye, Building2, User, Flame, Thermometer, Snowflake } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

export function DealsTable({
  deals,
  stages,
  profiles,
  onEdit,
  onDelete,
  isLoading,
}: DealsTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<Deal>[]>(() => [
    {
      accessorKey: 'person',
      header: 'Pessoa de Contato',
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
      filterFn: (row, id, value) => {
        const person = row.original.person;
        if (!person) return false;
        return person.name.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      accessorKey: 'stage',
      header: 'Etapa',
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
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        return row.original.stage_id === value;
      },
    },
    {
      accessorKey: 'title',
      header: 'Título',
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
      header: 'Valor',
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
      header: 'Criado em',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.original.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
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
      header: 'Organização',
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
      filterFn: (row, id, value) => {
        const org = row.original.organization;
        if (!org) return false;
        return org.name.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      accessorKey: 'insurance_type',
      header: 'Tipo Seguro',
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
      header: 'Etiqueta',
      cell: ({ row }) => {
        const label = row.original.label as keyof typeof labelConfig;
        if (!label) return <span className="text-muted-foreground">-</span>;
        const config = labelConfig[label];
        if (!config) return <span className="text-muted-foreground">{label}</span>;
        const Icon = config.icon;
        return (
          <Badge variant="outline" className={cn("border gap-1", config.className)}>
            <Icon className="h-3 w-3" />
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
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  const stageFilter = columnFilters.find(f => f.id === 'stage')?.value as string || 'all';
  const statusFilter = columnFilters.find(f => f.id === 'status')?.value as string || 'all';
  const labelFilter = columnFilters.find(f => f.id === 'label')?.value as string || 'all';
  const insuranceFilter = columnFilters.find(f => f.id === 'insurance_type')?.value as string || 'all';

  return (
    <div className="space-y-4">
      {/* Filters */}
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} negócio(s)
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </div>
  );
}
