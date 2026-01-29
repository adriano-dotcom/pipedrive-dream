import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, User, Calendar } from 'lucide-react';
import { RecordNavigation } from '@/components/shared/RecordNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonSidebar } from '@/components/people/detail/PersonSidebar';
import { PersonTimeline } from '@/components/people/detail/PersonTimeline';
import { PersonNotes } from '@/components/people/detail/PersonNotes';
import { PersonFiles } from '@/components/people/detail/PersonFiles';
import { PersonActivities } from '@/components/people/detail/PersonActivities';
import { PersonDeals } from '@/components/people/detail/PersonDeals';
import { PersonEmails } from '@/components/people/detail/PersonEmails';
import { ActivityFormSheet } from '@/components/activities/ActivityFormSheet';
import { useSentEmails } from '@/hooks/useSentEmails';
import { DealFormSheet } from '@/components/deals/DealFormSheet';
import { PersonFormSheet } from '@/components/people/PersonFormSheet';
import { usePersonDetails } from '@/hooks/usePersonDetails';
import { usePersonFiles } from '@/hooks/usePersonFiles';
import { PageBreadcrumbs } from '@/components/layout/PageBreadcrumbs';
import { supabase } from '@/integrations/supabase/client';
import { isPast, isToday } from 'date-fns';

const getLabelColor = (label: string | null) => {
  switch (label) {
    case 'Quente':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'Morno':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Frio':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return '';
  }
};

export default function PersonDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [dealSheetOpen, setDealSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const {
    person,
    history,
    notes,
    activities,
    deals,
    isLoading,
    addNote,
    isAddingNote,
    togglePin,
    deleteNote,
    updateNote,
  } = usePersonDetails(id || '');

  const {
    files,
    isLoading: isLoadingFiles,
    uploadFile,
    isUploading,
    downloadFile,
    deleteFile,
  } = usePersonFiles(id || '');

  const { emails } = useSentEmails('person', id || '');

  // Fetch default pipeline for new deals
  const { data: defaultPipeline } = useQuery({
    queryKey: ['default-pipeline'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pipelines')
        .select('id')
        .eq('is_default', true)
        .maybeSingle();
      
      if (!data) {
        const { data: first } = await supabase
          .from('pipelines')
          .select('id')
          .order('created_at')
          .limit(1)
          .maybeSingle();
        return first;
      }
      return data;
    },
  });

  // Fetch stages for default pipeline
  const { data: defaultStages = [] } = useQuery({
    queryKey: ['stages', defaultPipeline?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('stages')
        .select('id, name, position, color, probability')
        .eq('pipeline_id', defaultPipeline!.id)
        .order('position');
      return data || [];
    },
    enabled: !!defaultPipeline?.id,
  });

  // Calculate activity stats
  const pendingActivities = activities.filter(a => !a.is_completed).length;
  const overdueActivities = activities.filter(a => {
    if (a.is_completed) return false;
    const dueDate = new Date(a.due_date);
    return isPast(dueDate) && !isToday(dueDate);
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse space-y-4 w-full max-w-4xl p-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-12 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-64 bg-muted rounded" />
            <div className="col-span-2 h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <h2 className="text-xl font-semibold mb-2">Pessoa não encontrada</h2>
        <p className="text-muted-foreground mb-4">A pessoa que você está procurando não existe ou foi removida.</p>
        <Button onClick={() => navigate('/people')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Pessoas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Breadcrumbs */}
      <PageBreadcrumbs
        items={[
          { label: 'Pessoas', href: '/people' },
          { label: person.name },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/people')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Record Navigation */}
          <RecordNavigation entityType="people" currentId={id || ''} />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary text-lg font-semibold">
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{person.name}</h1>
              {person.label && (
                <Badge variant="secondary" className={getLabelColor(person.label)}>
                  {person.label}
                </Badge>
              )}
            </div>
            {person.job_title && (
              <p className="text-sm text-muted-foreground">{person.job_title}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setActivitySheetOpen(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Nova Atividade
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDealSheetOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Negócio
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setEditSheetOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <PersonSidebar 
            person={person} 
            pendingActivities={pendingActivities}
            overdueActivities={overdueActivities}
          />
        </div>

        {/* Tabs Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="w-full justify-start bg-muted/50 p-1 flex-wrap h-auto gap-1">
              <TabsTrigger value="notes" className="flex-1 sm:flex-none">
                Notas ({notes.length})
              </TabsTrigger>
              <TabsTrigger value="files" className="flex-1 sm:flex-none">
                Arquivos ({files.length})
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex-1 sm:flex-none">
                Atividades ({activities.length})
              </TabsTrigger>
              <TabsTrigger value="deals" className="flex-1 sm:flex-none">
                Negócios ({deals.length})
              </TabsTrigger>
              <TabsTrigger value="emails" className="flex-1 sm:flex-none">
                E-mails ({emails.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 sm:flex-none">
                Histórico ({history.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4">
              <PersonNotes
                notes={notes}
                onAddNote={addNote}
                onTogglePin={togglePin}
                onDeleteNote={deleteNote}
                onEditNote={updateNote}
                isAdding={isAddingNote}
                personId={id || ''}
                personName={person?.name || ''}
              />
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <PersonFiles
                files={files}
                isLoading={isLoadingFiles}
                isUploading={isUploading}
                onUpload={uploadFile}
                onDownload={downloadFile}
                onDelete={deleteFile}
              />
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <PersonActivities activities={activities} />
            </TabsContent>

            <TabsContent value="deals" className="mt-4">
              <PersonDeals deals={deals} />
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              <PersonEmails
                personId={id || ''}
                personName={person?.name || ''}
                recipientEmail={person?.email || ''}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <PersonTimeline history={history} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Activity Form Sheet */}
      <ActivityFormSheet
        open={activitySheetOpen}
        onOpenChange={setActivitySheetOpen}
        defaultPersonId={id}
      />

      {/* Deal Form Sheet */}
      {defaultPipeline && (
        <DealFormSheet
          open={dealSheetOpen}
          onOpenChange={setDealSheetOpen}
          deal={null}
          pipelineId={defaultPipeline.id}
          stages={defaultStages}
          defaultPersonId={id}
        />
      )}

      {/* Person Edit Sheet */}
      <PersonFormSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        person={person}
      />
    </div>
  );
}
