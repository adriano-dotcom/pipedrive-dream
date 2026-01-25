import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, XCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DealStageProgress } from '@/components/deals/detail/DealStageProgress';
import { DealSidebar } from '@/components/deals/detail/DealSidebar';
import { DealTimeline } from '@/components/deals/detail/DealTimeline';
import { DealNotes } from '@/components/deals/detail/DealNotes';
import { DealActivities } from '@/components/deals/detail/DealActivities';
import { useDealDetails } from '@/hooks/useDealDetails';

export default function DealDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
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
    updateStage,
    updateDealStatus,
  } = useDealDetails(id || '');

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
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              <Button
                variant="outline"
                className="border-success/30 text-success hover:bg-success/10"
                onClick={() => updateDealStatus('won')}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Ganho
              </Button>
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => updateDealStatus('lost')}
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
              <TabsTrigger value="activities" className="flex-1 sm:flex-none">
                Atividades ({activities.length})
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
                isAdding={isAddingNote}
              />
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <DealActivities activities={activities} />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <DealTimeline history={history} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
