import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, FileText, History, StickyNote, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { sanitizeHtml } from '@/lib/sanitize';

type Activity = Tables<'activities'>;
type DealNote = Tables<'deal_notes'>;
type DealFile = Tables<'deal_files'>;

interface DealHistoryItem {
  id: string;
  description: string;
  created_at: string | null;
  event_type: string;
}

interface DealSummaryProps {
  activities: Activity[];
  notes: DealNote[];
  files: DealFile[];
  history: DealHistoryItem[];
  onTabChange: (tab: string) => void;
}

const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case 'call':
      return '📞';
    case 'meeting':
      return '🤝';
    case 'email':
      return '✉️';
    case 'task':
      return '✅';
    default:
      return '📅';
  }
};

const getActivityTypeLabel = (type: string) => {
  switch (type) {
    case 'call':
      return 'Ligação';
    case 'meeting':
      return 'Reunião';
    case 'email':
      return 'E-mail';
    case 'task':
      return 'Tarefa';
    default:
      return 'Atividade';
  }
};

export function DealSummary({ 
  activities, 
  notes, 
  files, 
  history,
  onTabChange 
}: DealSummaryProps) {
  // Próxima atividade pendente
  const nextActivity = activities
    .filter(a => !a.is_completed && a.due_date)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  // Última nota (já vem ordenada por created_at desc)
  const latestNote = notes[0];

  // Arquivos recentes (3 últimos)
  const recentFiles = files.slice(0, 3);

  // Timeline resumida (3 últimos eventos)
  const recentHistory = history.slice(0, 3);

  // Contadores
  const pendingActivities = activities.filter(a => !a.is_completed).length;
  const completedActivities = activities.filter(a => a.is_completed).length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Próxima Atividade */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            Próxima Atividade
            {pendingActivities > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {pendingActivities} pendente{pendingActivities > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextActivity ? (
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-xl">{getActivityTypeIcon(nextActivity.activity_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{nextActivity.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {getActivityTypeLabel(nextActivity.activity_type)} • {format(new Date(nextActivity.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    {nextActivity.due_time && ` às ${nextActivity.due_time.slice(0, 5)}`}
                  </p>
                </div>
              </div>
              {completedActivities > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  {completedActivities} atividade{completedActivities > 1 ? 's' : ''} concluída{completedActivities > 1 ? 's' : ''}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma atividade agendada</p>
          )}
          <Button 
            variant="link" 
            className="p-0 h-auto mt-2 text-sm"
            onClick={() => onTabChange('activities')}
          >
            Ver todas atividades
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Última Nota */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <StickyNote className="h-4 w-4 text-primary" />
            Última Nota
            {notes.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {notes.length} nota{notes.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestNote ? (
            <div className="space-y-1">
              <p className="text-sm line-clamp-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(latestNote.content) }} />
              <p className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                {formatDistanceToNow(new Date(latestNote.created_at || ''), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma nota adicionada</p>
          )}
          <Button 
            variant="link" 
            className="p-0 h-auto mt-2 text-sm"
            onClick={() => onTabChange('notes')}
          >
            Ver todas notas
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Arquivos Recentes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <FileText className="h-4 w-4 text-primary" />
            Anexos Recentes
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {files.length} arquivo{files.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentFiles.length > 0 ? (
            <div className="space-y-2">
              {recentFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{file.file_name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(file.file_size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum arquivo anexado</p>
          )}
          <Button 
            variant="link" 
            className="p-0 h-auto mt-2 text-sm"
            onClick={() => onTabChange('files')}
          >
            Ver todos anexos
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Timeline Resumida */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <History className="h-4 w-4 text-primary" />
            Histórico Recente
            {history.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {history.length} evento{history.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentHistory.length > 0 ? (
            <div className="space-y-2">
              {recentHistory.map((event) => (
                <div key={event.id} className="flex items-start gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{event.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at || ''), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado</p>
          )}
          <Button 
            variant="link" 
            className="p-0 h-auto mt-2 text-sm"
            onClick={() => onTabChange('history')}
          >
            Ver histórico completo
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
