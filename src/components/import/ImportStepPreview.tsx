import { useMemo } from 'react';
import { Check, AlertTriangle, XCircle, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ImportRow } from '@/lib/import';

interface ImportStepPreviewProps {
  rows: ImportRow[];
  onToggleRow: (index: number) => void;
  onToggleAll: (selected: boolean) => void;
  existingEmails: Set<string>;
  existingCpfs: Set<string>;
  existingCnpjs: Set<string>;
}

export function ImportStepPreview({
  rows,
  onToggleRow,
  onToggleAll,
  existingEmails,
  existingCpfs,
  existingCnpjs,
}: ImportStepPreviewProps) {
  const stats = useMemo(() => {
    const selected = rows.filter(r => r.selected);
    return {
      total: rows.length,
      selected: selected.length,
      valid: selected.filter(r => r.status === 'valid').length,
      warnings: selected.filter(r => r.status === 'warning').length,
      errors: selected.filter(r => r.status === 'error').length,
    };
  }, [rows]);

  const allSelected = rows.every(r => r.selected);
  const someSelected = rows.some(r => r.selected) && !allSelected;

  const getStatusIcon = (status: ImportRow['status']) => {
    switch (status) {
      case 'valid':
        return <Check className="h-4 w-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (row: ImportRow) => {
    const { mappedData } = row;
    const messages: string[] = [];

    // Check for duplicates in database
    if (mappedData.email && existingEmails.has(mappedData.email.toLowerCase())) {
      messages.push('Email existe');
    }
    if (mappedData.cpf && existingCpfs.has(mappedData.cpf.replace(/\D/g, ''))) {
      messages.push('CPF existe');
    }
    if (mappedData.cnpj && existingCnpjs.has(mappedData.cnpj.replace(/\D/g, ''))) {
      messages.push('CNPJ existe');
    }

    if (messages.length > 0) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">
          {messages.join(', ')}
        </Badge>
      );
    }

    if (row.status === 'error') {
      return (
        <Badge variant="destructive" className="text-[10px]">
          {row.messages[0] || 'Erro'}
        </Badge>
      );
    }

    if (row.status === 'warning' && row.messages.length > 0) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">
          {row.messages[0]}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 text-[10px]">
        OK
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{stats.total}</span>
          <span className="text-sm text-muted-foreground">registros</span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-emerald-500" />
            {stats.valid} válidos
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {stats.warnings} alertas
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-destructive" />
            {stats.errors} erros
          </span>
        </div>
      </div>

      {/* Info about updates */}
      {stats.warnings > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-800 dark:text-amber-200">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Registros com alertas de duplicata serão <strong>atualizados</strong> com os novos dados.
          </span>
        </div>
      )}

      {/* Table */}
      <ScrollArea className="h-[300px] rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  // @ts-ignore - indeterminate is valid
                  indeterminate={someSelected}
                  onCheckedChange={onToggleAll}
                />
              </TableHead>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.index}
                className={cn(
                  !row.selected && 'opacity-50',
                  row.status === 'error' && 'bg-destructive/5'
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={row.selected}
                    onCheckedChange={() => onToggleRow(row.index)}
                    disabled={row.status === 'error'}
                  />
                </TableCell>
                <TableCell>
                  {getStatusIcon(row.status)}
                </TableCell>
                <TableCell className="font-medium">
                  {row.mappedData.name || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.mappedData.email || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.mappedData.org_name || '-'}
                </TableCell>
                <TableCell>
                  {getStatusBadge(row)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Selection Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
        <span>{stats.selected} de {stats.total} selecionados para importar</span>
        {stats.errors > 0 && (
          <span className="text-destructive">
            {stats.errors} registro(s) com erro não serão importados
          </span>
        )}
      </div>
    </div>
  );
}
