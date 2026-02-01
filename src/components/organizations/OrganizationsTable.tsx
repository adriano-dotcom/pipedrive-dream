import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  ColumnOrderState,
  SortingState,
  VisibilityState,
  Column,
  RowSelectionState,
} from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Pencil, Trash2, GripVertical, Phone, Mail, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowUpDown, Settings2, Eye, RotateCcw, Star, GitMerge, Loader2, RefreshCw } from 'lucide-react';
import { useEnrichOrganizationList } from '@/hooks/useEnrichOrganizationList';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExportButtons } from '@/components/shared/ExportButtons';
import type { ExportColumn } from '@/lib/export';
import { useIsMobile } from '@/hooks/use-mobile';
import { OrganizationsMobileList } from './OrganizationsMobileList';
import type { Tables } from '@/integrations/supabase/types';
import { formatCnpj } from '@/lib/utils';

type Organization = Tables<'organizations'>;

type OrganizationWithContact = Organization & {
  primary_contact: {
    id?: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  is_fallback_contact?: boolean;
  fallback_contact_id?: string;
};

interface OrganizationsTableProps {
  organizations: OrganizationWithContact[];
  isAdmin: boolean;
  onEdit: (org: OrganizationWithContact) => void;
  onDelete: (org: OrganizationWithContact) => void;
  onSetPrimaryContact?: (orgId: string, contactId: string) => void;
  isSettingPrimaryContact?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onBulkDelete?: () => void;
  onMerge?: () => void;
  onBulkEnrich?: () => void;
  // Server-side pagination props
  totalCount?: number;
  pageCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isFetching?: boolean;
}

const COLUMN_ORDER_KEY = 'org-table-column-order';
const COLUMN_VISIBILITY_KEY = 'org-table-column-visibility';

const defaultColumnOrder = [
  'name',
  'cnpj',
  'automotores',
  'contact_name',
  'contact_phone',
  'contact_email',
  'city',
  'label',
  'actions',
];

const columnLabels: Record<string, string> = {
  name: 'Nome',
  cnpj: 'CNPJ',
  automotores: 'Automotores',
  contact_name: 'Contato Principal',
  contact_phone: 'Telefone',
  contact_email: 'Email',
  city: 'Cidade',
  label: 'Status',
  actions: 'Ações',
};

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

function SortableHeader({ column, title }: { column: Column<OrganizationWithContact>; title: string }) {
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

export function OrganizationsTable({
  organizations,
  isAdmin,
  onEdit,
  onDelete,
  onSetPrimaryContact,
  isSettingPrimaryContact,
  selectedIds = [],
  onSelectionChange,
  onBulkDelete,
  onMerge,
  onBulkEnrich,
  // Server-side pagination props
  totalCount = 0,
  pageCount = 1,
  currentPage = 0,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  isFetching = false,
}: OrganizationsTableProps) {
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
    const saved = localStorage.getItem(COLUMN_ORDER_KEY);
    return saved ? JSON.parse(saved) : defaultColumnOrder;
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync row selection with parent callback
  useEffect(() => {
    const selectedRowIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    onSelectionChange?.(selectedRowIds);
  }, [rowSelection, onSelectionChange]);

  // Sync incoming selectedIds with local rowSelection state
  useEffect(() => {
    const newSelection: RowSelectionState = {};
    selectedIds.forEach(id => {
      newSelection[id] = true;
    });
    setRowSelection(newSelection);
  }, [selectedIds]);

  useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder));
    }
  }, [columnOrder]);

  useEffect(() => {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const handleResetColumns = () => {
    setColumnVisibility({});
    setColumnOrder(defaultColumnOrder);
    localStorage.removeItem(COLUMN_VISIBILITY_KEY);
    localStorage.removeItem(COLUMN_ORDER_KEY);
  };

  // Export columns configuration
  const exportColumns: ExportColumn[] = useMemo(() => [
    { id: 'name', label: 'Nome', accessor: (row: OrganizationWithContact) => row.name },
    { id: 'cnpj', label: 'CNPJ', accessor: (row: OrganizationWithContact) => row.cnpj },
    { id: 'automotores', label: 'Automotores', accessor: (row: OrganizationWithContact) => row.automotores },
    { id: 'contact_name', label: 'Contato Principal', accessor: (row: OrganizationWithContact) => row.primary_contact?.name },
    { id: 'contact_phone', label: 'Telefone Contato', accessor: (row: OrganizationWithContact) => row.primary_contact?.phone },
    { id: 'contact_email', label: 'Email Contato', accessor: (row: OrganizationWithContact) => row.primary_contact?.email },
    { id: 'city', label: 'Cidade', accessor: (row: OrganizationWithContact) => 
      row.address_city ? `${row.address_city}/${row.address_state || ''}` : null
    },
    { id: 'label', label: 'Status', accessor: (row: OrganizationWithContact) => row.label },
  ], []);

  // Flag for showing selection checkboxes
  const showSelection = isAdmin && onSelectionChange;

  const baseColumns = useMemo<ColumnDef<OrganizationWithContact>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column, table }) => (
          <div className="flex items-center gap-2">
            {showSelection && (
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() || 
                  (table.getIsSomePageRowsSelected() ? 'indeterminate' : false)
                }
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
              to={`/organizations/${row.original.id}`}
              className="font-medium text-primary hover:underline"
            >
              {row.original.name}
            </Link>
          </div>
        ),
      },
      {
        id: 'cnpj',
        accessorKey: 'cnpj',
        header: ({ column }) => <SortableHeader column={column} title="CNPJ" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-sm">
            {row.original.cnpj ? formatCnpj(row.original.cnpj) : '-'}
          </span>
        ),
      },
      {
        id: 'automotores',
        accessorKey: 'automotores',
        header: ({ column }) => <SortableHeader column={column} title="Automotores" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.automotores ?? '-'}
          </span>
        ),
      },
      {
        id: 'contact_name',
        accessorFn: (row) => row.primary_contact?.name ?? '',
        header: ({ column }) => <SortableHeader column={column} title="Contato Principal" />,
        cell: ({ row }) => {
          const { primary_contact, primary_contact_id, is_fallback_contact, fallback_contact_id, id: orgId } = row.original;
          
          if (!primary_contact) {
            return <span className="text-muted-foreground">-</span>;
          }
          
          const contactId = is_fallback_contact ? fallback_contact_id : primary_contact_id;
          
          if (is_fallback_contact && fallback_contact_id) {
            return (
              <div className="flex items-center gap-1">
                <Link
                  to={`/people/${contactId}`}
                  className="text-muted-foreground hover:text-primary hover:underline transition-colors italic"
                >
                  {primary_contact.name}
                  <span className="text-xs ml-1 not-italic opacity-70">(vinculado)</span>
                </Link>
                {onSetPrimaryContact && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetPrimaryContact(orgId, fallback_contact_id);
                          }}
                          disabled={isSettingPrimaryContact}
                        >
                          <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-amber-500 transition-colors" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Definir como contato principal</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          }
          
          return (
            <Link
              to={`/people/${contactId}`}
              className="text-muted-foreground hover:text-primary hover:underline transition-colors"
            >
              {primary_contact.name}
            </Link>
          );
        },
      },
      {
        id: 'contact_phone',
        accessorFn: (row) => row.primary_contact?.phone ?? '',
        header: ({ column }) => <SortableHeader column={column} title="Telefone" />,
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
      },
      {
        id: 'contact_email',
        accessorFn: (row) => row.primary_contact?.email ?? '',
        header: ({ column }) => <SortableHeader column={column} title="Email" />,
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
      },
      {
        id: 'city',
        accessorFn: (row) =>
          row.address_city ? `${row.address_city}/${row.address_state}` : '',
        header: ({ column }) => <SortableHeader column={column} title="Cidade" />,
        cell: ({ row }) =>
          row.original.address_city ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {row.original.address_city}/{row.original.address_state}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: 'label',
        accessorKey: 'label',
        header: ({ column }) => <SortableHeader column={column} title="Status" />,
        cell: ({ row }) =>
          row.original.label ? (
            <Badge variant="secondary" className={getLabelColor(row.original.label)}>
              {row.original.label}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: function ActionsCell({ row }) {
          const { enrich, enrichingId } = useEnrichOrganizationList();
          const org = row.original;
          
          return (
            <div className="flex items-center justify-center gap-1">
              {org.cnpj && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => enrich({ organizationId: org.id, cnpj: org.cnpj! })}
                        disabled={enrichingId === org.id}
                      >
                        {enrichingId === org.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Atualizar via Receita Federal</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(org)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(org)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [isAdmin, onEdit, onDelete, onSetPrimaryContact, isSettingPrimaryContact, showSelection]
  );

  // Just use baseColumns directly (selection is now integrated in name column)
  const columns = baseColumns;

  const table = useReactTable({
    data: organizations,
    columns,
    state: {
      sorting,
      columnOrder: columnOrder.length > 0 ? columnOrder : defaultColumnOrder,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: isAdmin,
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

    const newOrder = [...table.getState().columnOrder];
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);
    setColumnOrder(newOrder);
  };

  // Mobile view
  if (isMobile) {
    return (
      <OrganizationsMobileList 
        organizations={organizations} 
        isAdmin={isAdmin} 
        onEdit={onEdit} 
        onDelete={onDelete}
        onSetPrimaryContact={onSetPrimaryContact}
        isSettingPrimaryContact={isSettingPrimaryContact}
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
    <div className="rounded-md border overflow-hidden relative">
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
            data={organizations} 
            columns={exportColumns} 
            filenamePrefix="organizacoes" 
          />
          
          {/* Bulk actions - appears when selection exists */}
          {isAdmin && selectedIds && selectedIds.length > 0 && (
            <div className="flex items-center gap-2 pl-4 border-l">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selecionada(s)
              </span>
              {onBulkEnrich && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkEnrich}
                  className="h-8"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Atualizar RF
                </Button>
              )}
              {selectedIds.length === 2 && onMerge && (
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
              <Button
                variant="destructive"
                size="sm"
                onClick={onBulkDelete}
                className="h-8"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Excluir
              </Button>
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
                          className={`text-center ${snapshot.isDragging ? 'bg-muted' : ''} ${
                            header.id === 'actions' ? 'w-[100px]' : ''
                          }`}
                        >
                          <div
                            className="flex items-center justify-center gap-1 cursor-grab"
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

      {/* Pagination Controls - Server-side */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border/50">
        <div className="flex flex-col sm:flex-row items-center gap-4">
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
