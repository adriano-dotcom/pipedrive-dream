import { useState, useMemo, useEffect } from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckSquare, 
  Phone, 
  Calendar, 
  Mail, 
  Clock,
  AlertCircle,
  MessageCircle,
  Building2,
  User,
  Briefcase,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  SortingState,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

export type Activity = Tables<'activities'> & {
  deal?: { id?: string; title: string } | null;
  person?: { id?: string; name: string; phone?: string | null; email?: string | null } | null;
  organization?: { id?: string; name: string } | null;
  creator?: { full_name: string } | null;
};

interface ActivitiesTableProps {
  activities: Activity[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (activity: Activity) => void;
}

const COLUMN_ORDER_KEY = 'activities-table-column-order';
const PAGE_SIZE_KEY = 'activities-table-page-size';

const activityTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  task: { icon: CheckSquare, label: 'Tarefa', color: 'text-blue-500' },
  call: { icon: Phone, label: 'Ligação', color: 'text-green-500' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'text-emerald-500' },
  meeting: { icon: Calendar, label: 'Reunião', color: 'text-purple-500' },
  email: { icon: Mail, label: 'Email', color: 'text-orange-500' },
  deadline: { icon: Clock, label: 'Prazo', color: 'text-red-500' },
};

const defaultColumnOrder = [
  'is_completed',
  'subject',
  'created_by',
  'person',
  'due_date',
  'organization',
  'phone',
  'email',
  'linked_to',
];

export function ActivitiesTable({ activities, onToggleComplete, onEdit }: ActivitiesTableProps) {
  const navigate = useNavigate();
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_ORDER_KEY);
      return saved ? JSON.parse(saved) : defaultColumnOrder;
    } catch {
      return defaultColumnOrder;
    }
  });

  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem(PAGE_SIZE_KEY)) || 25;
    } catch {
      return 25;
    }
  });

  // Persist column order
  useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder));
    }
  }, [columnOrder]);

  // Persist page size
  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
  }, [pageSize]);

  const handleCheckboxChange = async (id: string, checked: boolean) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      await onToggleComplete(id, checked);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatDueDate = (dateStr: string, timeStr: string | null) => {
    const date = parseISO(dateStr);
    const formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR });
    const formattedTime = timeStr ? timeStr.slice(0, 5) : null;
    return { formattedDate, formattedTime };
  };

  const isOverdue = (activity: Activity) => {
    const dueDate = parseISO(activity.due_date);
    return isPast(dueDate) && !isToday(dueDate) && !activity.is_completed;
  };

  const getLinkedEntity = (activity: Activity) => {
    if (activity.deal) {
      return { type: 'deal', icon: Briefcase, name: activity.deal.title, id: activity.deal_id };
    }
    if (activity.person) {
      return { type: 'person', icon: User, name: activity.person.name, id: activity.person_id };
    }
    if (activity.organization) {
      return { type: 'organization', icon: Building2, name: activity.organization.name, id: activity.organization_id };
    }
    return null;
  };

  const columns = useMemo<ColumnDef<Activity>[]>(() => [
    {
      id: 'is_completed',
      accessorKey: 'is_completed',
      header: '',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.original.is_completed}
            onCheckedChange={(checked) => handleCheckboxChange(row.original.id, checked as boolean)}
            disabled={updatingIds.has(row.original.id)}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      ),
      enableColumnFilter: false,
      size: 50,
    },
    {
      id: 'subject',
      accessorKey: 'title',
      header: 'Assunto',
      cell: ({ row }) => {
        const typeConfig = activityTypeConfig[row.original.activity_type] || activityTypeConfig.task;
        const TypeIcon = typeConfig.icon;
        return (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <TypeIcon className={cn("h-4 w-4 flex-shrink-0", typeConfig.color)} />
                </div>
              </TooltipTrigger>
              <TooltipContent>{typeConfig.label}</TooltipContent>
            </Tooltip>
            <span className={cn(
              "font-medium truncate",
              row.original.is_completed && "line-through text-muted-foreground"
            )}>
              {row.original.title}
            </span>
            {row.original.priority === 'high' && !row.original.is_completed && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0 flex-shrink-0">
                Alta
              </Badge>
            )}
          </div>
        );
      },
      enableColumnFilter: true,
      size: 200,
    },
    {
      id: 'created_by',
      accessorFn: (row) => row.creator?.full_name ?? '',
      header: 'Criado por',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate">
          {row.original.creator?.full_name || '—'}
        </span>
      ),
      enableColumnFilter: true,
      size: 150,
    },
    {
      id: 'person',
      accessorFn: (row) => row.person?.name ?? '',
      header: 'Pessoa de contato',
      cell: ({ row }) => (
        row.original.person ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-secondary/80 truncate max-w-[160px]"
                onClick={(e) => {
                  e.stopPropagation();
                  if (row.original.person_id) {
                    navigate(`/people/${row.original.person_id}`);
                  }
                }}
              >
                <User className="h-3 w-3 mr-1" />
                {row.original.person.name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Clique para ver detalhes</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
      enableColumnFilter: true,
      size: 180,
    },
    {
      id: 'due_date',
      accessorKey: 'due_date',
      header: 'Data de vencimento',
      cell: ({ row }) => {
        const { formattedDate, formattedTime } = formatDueDate(row.original.due_date, row.original.due_time);
        const overdue = isOverdue(row.original);
        return (
          <div className={cn(
            "flex items-center gap-1.5 text-sm",
            overdue ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {overdue && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
            <span>{formattedDate}</span>
            {formattedTime && (
              <span className="text-xs opacity-75">{formattedTime}</span>
            )}
          </div>
        );
      },
      enableColumnFilter: true,
      size: 130,
    },
    {
      id: 'organization',
      accessorFn: (row) => row.organization?.name ?? '',
      header: 'Organização',
      cell: ({ row }) => (
        row.original.organization ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-sm font-normal hover:underline text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  if (row.original.organization_id) {
                    navigate(`/organizations/${row.original.organization_id}`);
                  }
                }}
              >
                <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
                <span className="truncate max-w-[140px]">{row.original.organization.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clique para ver detalhes</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
      enableColumnFilter: true,
      size: 180,
    },
    {
      id: 'phone',
      accessorFn: (row) => row.person?.phone ?? '',
      header: 'Telefone',
      cell: ({ row }) => (
        row.original.person?.phone ? (
          <a 
            href={`tel:${row.original.person.phone}`}
            className="text-sm text-muted-foreground hover:text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.person.phone}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
      enableColumnFilter: true,
      size: 130,
    },
    {
      id: 'email',
      accessorFn: (row) => row.person?.email ?? '',
      header: 'E-mail',
      cell: ({ row }) => (
        row.original.person?.email ? (
          <a 
            href={`mailto:${row.original.person.email}`}
            className="text-sm text-muted-foreground hover:text-primary hover:underline truncate max-w-[160px] block"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.person.email}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
      enableColumnFilter: true,
      size: 180,
    },
    {
      id: 'linked_to',
      header: 'Vinculado a',
      cell: ({ row }) => {
        const linkedEntity = getLinkedEntity(row.original);
        return linkedEntity ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-accent truncate max-w-[90px]"
                onClick={(e) => {
                  e.stopPropagation();
                  if (linkedEntity.id) {
                    if (linkedEntity.type === 'deal') {
                      navigate(`/deals/${linkedEntity.id}`);
                    } else if (linkedEntity.type === 'person') {
                      navigate(`/people/${linkedEntity.id}`);
                    } else if (linkedEntity.type === 'organization') {
                      navigate(`/organizations/${linkedEntity.id}`);
                    }
                  }
                }}
              >
                <linkedEntity.icon className="h-3 w-3 mr-1" />
                <span className="truncate">
                  {linkedEntity.type === 'deal' ? 'Negócio' : linkedEntity.type === 'person' ? 'Pessoa' : 'Org'}
                </span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{linkedEntity.name}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
      enableColumnFilter: false,
      size: 100,
    },
  ], [navigate, updatingIds]);

  const table = useReactTable({
    data: activities,
    columns,
    state: {
      columnFilters,
      columnOrder: columnOrder.length > 0 ? columnOrder : defaultColumnOrder,
      sorting,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const currentOrder = table.getState().columnOrder;
    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);
    setColumnOrder(newOrder);
  };

  if (activities.length === 0) {
    return null;
  }

  const headerGroup = table.getHeaderGroups()[0];

  return (
    <TooltipProvider>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <Droppable droppableId="columns" direction="horizontal">
                  {(provided) => (
                    <TableRow 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                    >
                      {headerGroup.headers.map((header, index) => (
                        <Draggable
                          key={header.id}
                          draggableId={header.id}
                          index={index}
                          isDragDisabled={header.id === 'is_completed'}
                        >
                          {(provided, snapshot) => (
                            <TableHead
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "align-top",
                                snapshot.isDragging && "bg-muted shadow-lg"
                              )}
                              style={{
                                ...provided.draggableProps.style,
                                width: header.column.getSize(),
                              }}
                            >
                              <div className="space-y-2">
                                {/* Header com Grip para arrastar */}
                                <div 
                                  className={cn(
                                    "flex items-center gap-1",
                                    header.id !== 'is_completed' && "cursor-grab active:cursor-grabbing"
                                  )}
                                  {...provided.dragHandleProps}
                                >
                                  {header.id !== 'is_completed' && (
                                    <GripVertical className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                                  )}
                                  <span className="text-xs font-semibold uppercase tracking-wider">
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                  </span>
                                </div>
                                
                                {/* Filtro Inline */}
                                {header.column.getCanFilter() && header.id !== 'is_completed' && header.id !== 'linked_to' && (
                                  <Input
                                    placeholder="Filtrar..."
                                    value={(header.column.getFilterValue() as string) ?? ''}
                                    onChange={(e) => header.column.setFilterValue(e.target.value)}
                                    className="h-7 text-xs"
                                  />
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
                {table.getRowModel().rows.map((row) => (
                  <TableRow 
                    key={row.id}
                    className={cn(
                      "cursor-pointer",
                      row.original.is_completed && "opacity-60"
                    )}
                    onClick={() => onEdit(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer com paginação */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <span className="text-sm text-muted-foreground">
              Mostrando {table.getRowModel().rows.length} de {table.getFilteredRowModel().rows.length} registros
            </span>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Itens por página:</span>
                <Select 
                  value={String(pageSize)} 
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    table.setPageSize(Number(value));
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
                <span className="text-sm text-muted-foreground px-2">
                  Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
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
        </div>
      </DragDropContext>
    </TooltipProvider>
  );
}
