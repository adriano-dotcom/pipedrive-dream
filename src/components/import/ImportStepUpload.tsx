import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadExampleCSV } from '@/lib/import';
import { cn } from '@/lib/utils';

interface ImportStepUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

const ACCEPTED_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ACCEPTED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImportStepUpload({ onFileSelect, isLoading, error }: ImportStepUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return 'Formato não suportado. Use CSV, XLS ou XLSX.';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'Arquivo muito grande. O tamanho máximo é 5MB.';
    }
    
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    
    setFileError(null);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const displayError = error || fileError;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          isLoading && "pointer-events-none opacity-50"
        )}
      >
        <input
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
            isDragging ? "bg-primary/20" : "bg-muted"
          )}>
            {isLoading ? (
              <FileSpreadsheet className="h-8 w-8 text-primary animate-pulse" />
            ) : (
              <Upload className={cn(
                "h-8 w-8 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            )}
          </div>
          
          <div>
            <p className="text-base font-medium">
              {isLoading ? 'Processando arquivo...' : 'Arraste um arquivo CSV ou Excel aqui'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ou clique para selecionar
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Formatos aceitos: .csv, .xls, .xlsx (máx. 5MB)</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {displayError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Download Example */}
      <div className="flex items-center justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={downloadExampleCSV}
          className="text-primary"
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar modelo de exemplo
        </Button>
      </div>
    </div>
  );
}
