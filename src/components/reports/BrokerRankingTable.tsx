import { useState, useMemo } from 'react';
import { ArrowUpDown, Medal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BrokerPerformance } from '@/hooks/useBrokerPerformance';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BrokerRankingTableProps {
  data: BrokerPerformance[] | undefined;
  isLoading: boolean;
}

type SortField = 'fullName' | 'totalDeals' | 'wonDeals' | 'lostDeals' | 'conversionRate' | 'totalWonValue' | 'totalCommissionValue' | 'pipelineValue';
type SortDirection = 'asc' | 'desc';

export function BrokerRankingTable({ data, isLoading }: BrokerRankingTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalWonValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    if (!data) return [];
    
    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const getRankMedal = (position: number) => {
    switch (position) {
      case 0:
        return <span className="text-xl">🥇</span>;
      case 1:
        return <span className="text-xl">🥈</span>;
      case 2:
        return <span className="text-xl">🥉</span>;
      default:
        return <span className="text-muted-foreground font-medium">{position + 1}</span>;
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={cn(
        "ml-1 h-3 w-3",
        sortField === field ? "text-primary" : "text-muted-foreground"
      )} />
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        Nenhum dado encontrado para o período selecionado
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>
            <SortableHeader field="fullName">Corretor</SortableHeader>
          </TableHead>
          <TableHead className="text-center">
            <SortableHeader field="totalDeals">Total</SortableHeader>
          </TableHead>
          <TableHead className="text-center">
            <SortableHeader field="wonDeals">Ganhos</SortableHeader>
          </TableHead>
          <TableHead className="text-center">
            <SortableHeader field="lostDeals">Perdidos</SortableHeader>
          </TableHead>
          <TableHead className="w-32">
            <SortableHeader field="conversionRate">Taxa Conv.</SortableHeader>
          </TableHead>
          <TableHead className="text-right">
            <SortableHeader field="totalWonValue">Valor Ganho</SortableHeader>
          </TableHead>
          <TableHead className="text-right">
            <SortableHeader field="totalCommissionValue">Comissão</SortableHeader>
          </TableHead>
          <TableHead className="text-right">
            <SortableHeader field="pipelineValue">Pipeline</SortableHeader>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((broker, index) => (
          <TableRow key={broker.userId}>
            <TableCell className="font-medium">
              {getRankMedal(index)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={broker.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(broker.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{broker.fullName}</span>
              </div>
            </TableCell>
            <TableCell className="text-center">{broker.totalDeals}</TableCell>
            <TableCell className="text-center text-green-600 font-medium">
              {broker.wonDeals}
            </TableCell>
            <TableCell className="text-center text-destructive font-medium">
              {broker.lostDeals}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Progress 
                  value={broker.conversionRate} 
                  className="h-2 w-16"
                />
                <span className="text-sm font-medium w-12">
                  {broker.wonDeals + broker.lostDeals > 0 
                    ? `${broker.conversionRate.toFixed(0)}%`
                    : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">N/A</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Sem negócios ganhos ou perdidos no período para calcular a taxa</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right font-medium text-green-600">
              {formatCurrency(broker.totalWonValue)}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(broker.totalCommissionValue)}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {formatCurrency(broker.pipelineValue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
