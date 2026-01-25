import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, XCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DealStageProgress } from '@/components/deals/detail/DealStageProgress';
import { DealSidebar } from '@/components/deals/detail/DealSidebar';
import { DealTimeline } from '@/components/deals/detail/DealTimeline';
import { DealNotes } from '@/components/deals/detail/DealNotes';
import { DealActivities } from '@/components/deals/detail/DealActivities';
import { DealFiles } from '@/components/deals/detail/DealFiles';
import { DealEmails } from '@/components/deals/detail/DealEmails';
import { LostReasonDialog } from '@/components/deals/detail/LostReasonDialog';
import { ActivityFormSheet } from '@/components/activities/ActivityFormSheet';
import { useSentEmails } from '@/hooks/useSentEmails';
import { useDealDetails } from '@/hooks/useDealDetails';
import { useDealFiles } from '@/hooks/useDealFiles';
import { Tables } from '@/integrations/supabase/types';

type Activity = Tables<'activities'>;

export default function DealDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const {
    deal,
    stages,
    history,
    notes,
    activities,
    isLoading,
    addNote,
    isAddingNote,
    togglePin,
    deleteNote,
    updateNote,
    updateStage,
    updateDealStatus,
    isUpdatingStatus,
    toggleActivity,
    isTogglingActivity,
  } = useDealDetails(id || '');

  const {
    files,
    isLoading: isLoadingFiles,
    uploadFile,
    isUploading,
    downloadFile,
    deleteFile,
  } = useDealFiles(id || '');

  const { emails } = useSentEmails('deal', id || '');

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

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <h2 className="text-xl font-semibold mb-2">Negócio não encontrado</h2>
        <p className="text-muted-foreground mb-4">O negócio que você está procurando não existe ou foi removido.</p>
        <Button onClick={() => navigate('/deals')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Negócios
        </Button>
      </div>
    );
  }

  const isOpen = deal.status === 'open';

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/deals')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{deal.title}</h1>
            <p className="text-sm text-muted-foreground">
              {deal.pipeline?.name} • {deal.stage?.name}
            </p>
            <p className="text-lg font-semibold text-primary mt-1">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(deal.value || 0)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              <Button
                variant="outline"
                className="border-success/30 text-success hover:bg-success/10"
                onClick={() => updateDealStatus({ status: 'won' })}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Ganho
              </Button>
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => setShowLostDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Perdido
              </Button>
            </>
          )}
          <Button variant="outline" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stage Progress */}
      <DealStageProgress
        stages={stages}
        currentStageId={deal.stage_id}
        onStageClick={isOpen ? updateStage : undefined}
        dealStatus={deal.status}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <DealSidebar deal={deal} />
        </div>

        {/* Tabs Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="w-full justify-start bg-muted/50 p-1">
              <TabsTrigger value="notes" className="flex-1 sm:flex-none">
                Notas ({notes.length})
              </TabsTrigger>
              <TabsTrigger value="files" className="flex-1 sm:flex-none">
                Arquivos ({files.length})
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex-1 sm:flex-none">
                Atividades ({activities.length})
              </TabsTrigger>
              <TabsTrigger value="emails" className="flex-1 sm:flex-none">
                E-mails ({emails.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 sm:flex-none">
                Histórico ({history.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4">
              <DealNotes
                notes={notes}
                onAddNote={addNote}
                onTogglePin={togglePin}
                onDeleteNote={deleteNote}
                onEditNote={(noteId, content) => updateNote({ noteId, content })}
                isAdding={isAddingNote}
                dealId={id || ''}
                dealTitle={deal?.title || ''}
              />
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <DealFiles
                files={files}
                isLoading={isLoadingFiles}
                isUploading={isUploading}
                onUpload={uploadFile}
                onDownload={downloadFile}
                onDelete={deleteFile}
              />
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <DealActivities 
                activities={activities} 
                onToggleActivity={(activityId, completed) => toggleActivity({ activityId, completed })}
                onActivityCompleted={() => {
                  setEditingActivity(null);
                  setActivityFormOpen(true);
                }}
                onNewActivity={() => {
                  setEditingActivity(null);
                  setActivityFormOpen(true);
                }}
                onEditActivity={(activity) => {
                  setEditingActivity(activity as Activity);
                  setActivityFormOpen(true);
                }}
                isToggling={isTogglingActivity}
              />
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              <DealEmails
                dealId={id || ''}
                dealTitle={deal?.title || ''}
                recipientEmail={deal?.person?.email || deal?.organization?.email || ''}
                recipientName={deal?.person?.name || deal?.organization?.name}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <DealTimeline history={history} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        open={showLostDialog}
        onOpenChange={setShowLostDialog}
        onConfirm={(reason) => {
          updateDealStatus({ status: 'lost', lostReason: reason });
          setShowLostDialog(false);
        }}
        isLoading={isUpdatingStatus}
      />

      {/* Activity Form Sheet */}
      <ActivityFormSheet
        open={activityFormOpen}
        onOpenChange={setActivityFormOpen}
        activity={editingActivity}
        defaultDealId={id}
        defaultPersonId={deal?.person_id}
        defaultOrganizationId={deal?.organization_id}
      />
    </div>
  );
}
