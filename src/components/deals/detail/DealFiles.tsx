import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Upload, 
  File, 
  FileText, 
  FileSpreadsheet, 
  Image, 
  Download, 
  Trash2,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DealFile } from '@/hooks/useDealFiles';

interface DealFilesProps {
  files: DealFile[];
  isLoading?: boolean;
  isUploading?: boolean;
  onUpload: (file: File) => void;
  onDownload: (filePath: string, fileName: string) => void;
  onDelete: (file: DealFile) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
];

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
  if (fileType.includes('word') || fileType.includes('document')) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DealFiles({
  files,
  isLoading,
  isUploading,
  onUpload,
  onDownload,
  onDelete,
}: DealFilesProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(validateAndUpload);
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(validateAndUpload);
    e.target.value = '';
  }, [onUpload]);

  const validateAndUpload = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`O arquivo "${file.name}" excede o limite de 10MB`);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert(`Tipo de arquivo não suportado: ${file.type || 'desconhecido'}`);
      return;
    }

    onUpload(file);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
          isDragOver
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept={ALLOWED_TYPES.join(',')}
          multiple
          disabled={isUploading}
        />
        
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Arraste arquivos aqui ou clique para enviar</p>
            <p className="text-xs text-muted-foreground">
              PDF, DOC, XLS, JPG, PNG (máx. 10MB)
            </p>
          </>
        )}
      </label>

      {/* Files List */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum arquivo anexado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.file_type);
            
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                    {file.profile?.full_name && (
                      <>
                        {' • '}
                        {file.profile.full_name}
                      </>
                    )}
                    {' • '}
                    {format(new Date(file.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDownload(file.file_path, file.file_name)}
                    title="Baixar arquivo"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(file)}
                    title="Excluir arquivo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
