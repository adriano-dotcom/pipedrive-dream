import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, User, Calendar, MoreHorizontal, GitMerge, Trash, AlertCircle, RotateCcw, MessageCircle } from 'lucide-react';
import { RecordNavigation } from '@/components/shared/RecordNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PersonSidebar } from '@/components/people/detail/PersonSidebar';
import { PersonTimeline } from '@/components/people/detail/PersonTimeline';
import { PersonNotes } from '@/components/people/detail/PersonNotes';
import { PersonFiles } from '@/components/people/detail/PersonFiles';
import { PersonActivities } from '@/components/people/detail/PersonActivities';
import { PersonDeals } from '@/components/people/detail/PersonDeals';
import { PersonEmails } from '@/components/people/detail/PersonEmails';
import { PersonWhatsApp } from '@/components/people/detail/PersonWhatsApp';
import { ActivityFormSheet } from '@/components/activities/ActivityFormSheet';
import { useSentEmails } from '@/hooks/useSentEmails';
import { DealFormSheet } from '@/components/deals/DealFormSheet';
import { PersonFormSheet } from '@/components/people/PersonFormSheet';
import { MergeContactsDialog } from '@/components/people/MergeContactsDialog';
import { ContactSearchDialog } from '@/components/people/ContactSearchDialog';
import { MergeUndoBanner } from '@/components/shared/MergeUndoBanner';
import { usePersonDetails } from '@/hooks/usePersonDetails';
import { usePersonFiles } from '@/hooks/usePersonFiles';
import { useMergeBackups } from '@/hooks/useMergeBackups';
import { useUndoMergeContact } from '@/hooks/useUndoMergeContact';
import { usePersonWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { PageBreadcrumbs } from '@/components/layout/PageBreadcrumbs';
import { supabase } from '@/integrations/supabase/client';
import { isPast, isToday } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Person = Tables<'people'>;

interface PersonWithOrg extends Person {
  organizations?: {
    id: string;
    name: string;
    cnpj: string | null;
    address_city: string | null;
    address_state: string | null;
    automotores: number | null;
  } | null;
}

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
  const [activeTab, setActiveTab] = useState('notes');
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [dealSheetOpen, setDealSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [contactSearchOpen, setContactSearchOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedMergePerson, setSelectedMergePerson] = useState<PersonWithOrg | null>(null);

  // Lazy load data based on active tab for better performance
  const {
    person,
    history,
    notes,
    activities,
    deals,
    isLoading,
    isError,
    error,
    refetch,
    addNote,
    isAddingNote,
    togglePin,
    deleteNote,
    updateNote,
  } = usePersonDetails(id || '', {
    loadHistory: activeTab === 'history',
    loadNotes: activeTab === 'notes',
    loadActivities: activeTab === 'activities',
    loadDeals: activeTab === 'deals',
  });

  const {
    files,
    isLoading: isLoadingFiles,
    uploadFile,
    isUploading,
    downloadFile,
    deleteFile,
  } = usePersonFiles(id || '');

  const { emails } = useSentEmails('person', id || '');
  
  // WhatsApp conversations for this person
  const { data: whatsappConversations = [] } = usePersonWhatsAppConversations(id || '');

  // Merge backup for undo functionality
  const { data: mergeBackup } = useMergeBackups(id || '', 'person');
  const { undoMerge, isUndoing } = useUndoMergeContact();

  // Fetch default pipeline for new deals - only when deal sheet is open
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
    enabled: dealSheetOpen,
  });

  // Fetch stages for default pipeline - only when deal sheet is open
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
    enabled: dealSheetOpen && !!defaultPipeline?.id,
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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar pessoa</h2>
        <p className="text-muted-foreground mb-4">
          Não foi possível carregar os dados. Tente novamente.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => refetch()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => navigate('/people')}>
            Voltar para Pessoas
          </Button>
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
      {/* Merge Undo Banner */}
      {mergeBackup && (
        <MergeUndoBanner
          backup={mergeBackup}
          entityName={person.name}
          onUndo={undoMerge}
          isUndoing={isUndoing}
        />
      )}

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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setContactSearchOpen(true)}>
                <GitMerge className="h-4 w-4 mr-2" />
                Mesclar com outro contato...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <Tabs defaultValue="notes" value={activeTab} onValueChange={setActiveTab} className="w-full">
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
              {whatsappConversations.length > 0 && (
                <TabsTrigger value="whatsapp" className="flex-1 sm:flex-none">
                  <MessageCircle className="h-4 w-4 mr-1 text-emerald-500" />
                  WhatsApp ({whatsappConversations.length})
                </TabsTrigger>
              )}
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
                organizationId={person?.organization_id || undefined}
              />
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-4">
              <PersonWhatsApp personId={id || ''} />
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

      {/* Contact Search Dialog for Merge */}
      <ContactSearchDialog
        open={contactSearchOpen}
        onOpenChange={setContactSearchOpen}
        excludeId={id || ''}
        onSelect={(selectedPerson) => {
          setSelectedMergePerson(selectedPerson);
          setMergeDialogOpen(true);
        }}
      />

      {/* Merge Contacts Dialog */}
      {person && selectedMergePerson && (
        <MergeContactsDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          person1={person as PersonWithOrg}
          person2={selectedMergePerson}
          onSuccess={(keepPersonId) => {
            setMergeDialogOpen(false);
            setSelectedMergePerson(null);
            // Redirect to the kept person
            navigate(`/people/${keepPersonId}`);
          }}
        />
      )}
    </div>
  );
}
