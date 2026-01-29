import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToCSV, exportToExcel, ExportColumn } from '@/lib/export';

interface ExportButtonsProps<T> {
  data: T[];
  columns: ExportColumn[];
  filenamePrefix: string;
  disabled?: boolean;
}

export function ExportButtons<T>({
  data,
  columns,
  filenamePrefix,
  disabled = false,
}: ExportButtonsProps<T>) {
  const handleExportCSV = () => {
    exportToCSV(data, columns, filenamePrefix);
  };

  const handleExportExcel = () => {
    exportToExcel(data, columns, filenamePrefix);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={handleExportCSV}
        disabled={disabled || data.length === 0}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">CSV</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={handleExportExcel}
        disabled={disabled || data.length === 0}
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline">Excel</span>
      </Button>
    </div>
  );
}
