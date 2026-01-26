import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  PaginationState,
  SortingState,
  VisibilityState,
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
import { Phone, Mail, Building2, Pencil, Trash2, GripVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowUpDown, Settings2, Eye, RotateCcw } from 'lucide-react';
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
}

interface PeopleTableProps {
  people: PersonWithOrg[];
  isAdmin: boolean;
  onEdit: (person: PersonWithOrg) => void;
  onDelete: (person: PersonWithOrg) => void;
}

const STORAGE_KEY = 'people-table-column-order';
const PAGE_SIZE_KEY = 'people-table-page-size';
const COLUMN_VISIBILITY_KEY = 'people-table-column-visibility';

const columnLabels: Record<string, string> = {
  name: 'Nome',
  phone: 'Telefone',
  email: 'Email',
  organization: 'Empresa',
  cnpj: 'CNPJ',
  city: 'Cidade',
  automotores: 'Automotores',
  job_title: 'Cargo',
  label: 'Status',
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

export function PeopleTable({ people, isAdmin, onEdit, onDelete }: PeopleTableProps) {
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: Number(localStorage.getItem(PAGE_SIZE_KEY)) || 25,
  });

  const columns = useMemo<ColumnDef<PersonWithOrg>[]>(() => [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} title="Nome" />,
      cell: ({ row }) => (
        <Link
          to={`/people/${row.original.id}`}
          className="font-medium hover:text-primary hover:underline transition-colors"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'phone',
      accessorKey: 'phone',
      header: ({ column }) => <SortableHeader column={column} title="Telefone" />,
      cell: ({ row }) => (
        row.original.phone ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            {row.original.phone}
          </span>
        ) : <span className="text-muted-foreground/50">-</span>
      ),
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
            {row.original.organizations.cnpj}
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
  ], [isAdmin, onEdit, onDelete]);

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
    data: people,
    columns,
    state: {
      sorting,
      columnOrder: columnOrder.length > 0 ? columnOrder : defaultColumnOrder,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/30">
      {/* Barra de ferramentas */}
      <div className="flex items-center justify-end px-4 py-2 border-b bg-muted/10">
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
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
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            {" "}a{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              people.length
            )}
            {" "}de {people.length} registros
          </span>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens por página:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                const newSize = Number(value);
                setPagination(prev => ({ ...prev, pageSize: newSize, pageIndex: 0 }));
                localStorage.setItem(PAGE_SIZE_KEY, value);
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
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="px-3 text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
          </span>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
