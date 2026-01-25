import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  PaginationState,
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Trash2, GripVertical, Phone, Mail, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

type OrganizationWithContact = Organization & {
  primary_contact: {
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

interface OrganizationsTableProps {
  organizations: OrganizationWithContact[];
  isAdmin: boolean;
  onEdit: (org: OrganizationWithContact) => void;
  onDelete: (org: OrganizationWithContact) => void;
}

const COLUMN_ORDER_KEY = 'org-table-column-order';
const PAGE_SIZE_KEY = 'organizations-table-page-size';

const getLabelColor = (label: string | null) => {
  switch (label) {
    case 'Quente':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'Morno':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'Frio':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return '';
  }
};

export function OrganizationsTable({
  organizations,
  isAdmin,
  onEdit,
  onDelete,
}: OrganizationsTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
    const saved = localStorage.getItem(COLUMN_ORDER_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: Number(localStorage.getItem(PAGE_SIZE_KEY)) || 25,
  });

  useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder));
    }
  }, [columnOrder]);

  const columns = useMemo<ColumnDef<OrganizationWithContact>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <Link 
            to={`/organizations/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.name}
          </Link>
        ),
        enableColumnFilter: true,
      },
      {
        id: 'cnpj',
        accessorKey: 'cnpj',
        header: 'CNPJ',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.cnpj || '-'}</span>
        ),
        enableColumnFilter: true,
      },
      {
        id: 'automotores',
        accessorKey: 'automotores',
        header: 'Automotores',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.automotores ?? '-'}
          </span>
        ),
        enableColumnFilter: true,
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue) return true;
          const value = row.getValue(columnId) as number | null;
          if (value === null) return false;
          return value.toString().includes(filterValue);
        },
      },
      {
        id: 'contact_name',
        accessorFn: (row) => row.primary_contact?.name ?? '',
        header: 'Contato Principal',
        cell: ({ row }) => (
          row.original.primary_contact && row.original.primary_contact_id ? (
            <Link
              to={`/people/${row.original.primary_contact_id}`}
              className="text-muted-foreground hover:text-primary hover:underline transition-colors"
            >
              {row.original.primary_contact.name}
            </Link>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        ),
        enableColumnFilter: true,
      },
      {
        id: 'contact_phone',
        accessorFn: (row) => row.primary_contact?.phone ?? '',
        header: 'Telefone',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-muted-foreground">
            {row.original.primary_contact?.phone ? (
              <>
                <Phone className="h-3 w-3" />
                {row.original.primary_contact.phone}
              </>
            ) : (
              '-'
            )}
          </span>
        ),
        enableColumnFilter: true,
      },
      {
        id: 'contact_email',
        accessorFn: (row) => row.primary_contact?.email ?? '',
        header: 'Email',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-muted-foreground">
            {row.original.primary_contact?.email ? (
              <>
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[180px]">
                  {row.original.primary_contact.email}
                </span>
              </>
            ) : (
              '-'
            )}
          </span>
        ),
        enableColumnFilter: true,
      },
      {
        id: 'city',
        accessorFn: (row) =>
          row.address_city ? `${row.address_city}/${row.address_state}` : '',
        header: 'Cidade',
        cell: ({ row }) =>
          row.original.address_city ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {row.original.address_city}/{row.original.address_state}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
        enableColumnFilter: true,
      },
      {
        id: 'label',
        accessorKey: 'label',
        header: 'Status',
        cell: ({ row }) =>
          row.original.label ? (
            <Badge variant="secondary" className={getLabelColor(row.original.label)}>
              {row.original.label}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
        enableColumnFilter: true,
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue || filterValue === 'all') return true;
          return row.getValue(columnId) === filterValue;
        },
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(row.original)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
        enableColumnFilter: false,
      },
    ],
    [isAdmin, onEdit, onDelete]
  );

  const table = useReactTable({
    data: organizations,
    columns,
    state: {
      columnFilters,
      columnOrder: columnOrder.length > 0 ? columnOrder : columns.map((c) => c.id as string),
      pagination,
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newOrder = [...table.getState().columnOrder];
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);
    setColumnOrder(newOrder);
  };

  const getFilterValue = (columnId: string): string => {
    const filter = columnFilters.find((f) => f.id === columnId);
    return (filter?.value as string) ?? '';
  };

  const setFilterValue = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      const existing = prev.filter((f) => f.id !== columnId);
      if (!value) return existing;
      return [...existing, { id: columnId, value }];
    });
  };

  return (
    <div className="rounded-md border">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader>
            <Droppable droppableId="columns" direction="horizontal">
              {(provided) => (
                <TableRow
                  ref={provided.innerRef}
                  {...provided.droppableProps}
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
                          className={`${snapshot.isDragging ? 'bg-muted' : ''} ${
                            header.id === 'actions' ? 'w-[100px]' : ''
                          }`}
                        >
                          <div className="space-y-2">
                            <div
                              className="flex items-center gap-1 cursor-grab"
                              {...provided.dragHandleProps}
                            >
                              {header.id !== 'actions' && (
                                <GripVertical className="h-3 w-3 text-muted-foreground" />
                              )}
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </div>
                            {header.column.getCanFilter() && header.id !== 'actions' && (
                              header.id === 'label' ? (
                                <Select
                                  value={getFilterValue(header.id) || 'all'}
                                  onValueChange={(value) =>
                                    setFilterValue(header.id, value === 'all' ? '' : value)
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Todos" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="Quente">Quente</SelectItem>
                                    <SelectItem value="Morno">Morno</SelectItem>
                                    <SelectItem value="Frio">Frio</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  placeholder="Filtrar..."
                                  value={getFilterValue(header.id)}
                                  onChange={(e) =>
                                    setFilterValue(header.id, e.target.value)
                                  }
                                  className="h-8 text-xs"
                                />
                              )
                            )}
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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhuma organização encontrada
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border/50">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Mostrando{' '}
            {table.getFilteredRowModel().rows.length === 0
              ? 0
              : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{' '}
            a{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            de {table.getFilteredRowModel().rows.length} registros
          </span>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens por página:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                const newSize = Number(value);
                setPagination((prev) => ({ ...prev, pageSize: newSize, pageIndex: 0 }));
                localStorage.setItem(PAGE_SIZE_KEY, value);
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
            Página {table.getState().pagination.pageIndex + 1} de{' '}
            {table.getPageCount() || 1}
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
