import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Calendar, 
  Clock,
  User,
  ShieldCheck,
  Truck,
  AlertCircle,
  DollarSign,
  MessageCircle,
  Pencil,
  Unlink,
  Trash2,
  Loader2,
} from 'lucide-react';
import { EmailButton } from '@/components/email/EmailButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PersonFormSheet } from '@/components/people/PersonFormSheet';
import type { Tables } from '@/integrations/supabase/types';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OrganizationPerson } from '@/hooks/useOrganizationDetails';
import { formatCnpj } from '@/lib/utils';

interface OrganizationSidebarProps {
  organization: {
    id: string;
    name: string;
    cnpj: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    label: string | null;
    notes: string | null;
    address_street: string | null;
    address_number: string | null;
    address_complement: string | null;
    address_neighborhood: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zipcode: string | null;
    insurance_branches: string[] | null;
    preferred_insurers: string[] | null;
    current_insurer: string | null;
    policy_renewal_month: number | null;
    annual_premium_estimate: number | null;
    risk_profile: string | null;
    has_claims_history: boolean | null;
    fleet_size: number | null;
    fleet_type: string | null;
    automotores: number | null;
    rntrc_antt: string | null;
    created_at: string;
  };
  people: OrganizationPerson[];
  pendingActivities: number;
  overdueActivities: number;
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
      return 'bg-muted text-muted-foreground';
  }
};

const getMonthName = (month: number | null) => {
  if (!month) return null;
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[month - 1];
};

export function OrganizationSidebar({ 
  organization, 
  people,
  pendingActivities,
  overdueActivities,
}: OrganizationSidebarProps) {
  const queryClient = useQueryClient();
  const [editingPerson, setEditingPerson] = useState<Tables<'people'> | null>(null);
  const [isLoadingPerson, setIsLoadingPerson] = useState(false);
  const [unlinkingPerson, setUnlinkingPerson] = useState<OrganizationPerson | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<OrganizationPerson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [personLinkedInfo, setPersonLinkedInfo] = useState<{ deals: number; activities: number } | null>(null);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);

  const handleEditPerson = async (e: React.MouseEvent, personId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoadingPerson(true);
    try {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('id', personId)
        .single();
      
      if (error) throw error;
      setEditingPerson(data);
    } catch (error) {
      toast.error('Erro ao carregar dados da pessoa');
    } finally {
      setIsLoadingPerson(false);
    }
  };

  const handleEditSuccess = () => {
    setEditingPerson(null);
    queryClient.invalidateQueries({ queryKey: ['organization-people', organization.id] });
  };

  const handleUnlinkPerson = async () => {
    if (!unlinkingPerson) return;
    
    setIsUnlinking(true);
    try {
      // Se a pessoa era o contato principal, limpar o primary_contact_id
      if (unlinkingPerson.is_primary) {
        const { error: orgError } = await supabase
          .from('organizations')
          .update({ primary_contact_id: null })
          .eq('id', organization.id);
        
        if (orgError) throw orgError;
      }
      
      // Desvincular a pessoa
      const { error } = await supabase
        .from('people')
        .update({ organization_id: null })
        .eq('id', unlinkingPerson.id);
      
      if (error) throw error;
      
      toast.success(`${unlinkingPerson.name} desvinculado da organização`);
      queryClient.invalidateQueries({ queryKey: ['organization-people', organization.id] });
      queryClient.invalidateQueries({ queryKey: ['organization', organization.id] });
    } catch (error) {
      toast.error('Erro ao desvincular pessoa');
    } finally {
      setIsUnlinking(false);
      setUnlinkingPerson(null);
    }
  };

  const handleOpenDeleteDialog = async (e: React.MouseEvent, person: OrganizationPerson) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCheckingLinks(true);
    
    try {
      // Buscar contagens de vínculos em paralelo
      const [dealsResult, activitiesResult] = await Promise.all([
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('person_id', person.id),
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('person_id', person.id),
      ]);
      
      setPersonLinkedInfo({
        deals: dealsResult.count || 0,
        activities: activitiesResult.count || 0,
      });
      setDeletingPerson(person);
    } catch (error) {
      toast.error('Erro ao verificar vínculos da pessoa');
    } finally {
      setIsCheckingLinks(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!deletingPerson) return;
    
    setIsDeleting(true);
    try {
      // Se a pessoa era o contato principal, limpar o primary_contact_id
      if (deletingPerson.is_primary) {
        const { error: orgError } = await supabase
          .from('organizations')
          .update({ primary_contact_id: null })
          .eq('id', organization.id);
        
        if (orgError) throw orgError;
      }
      
      // Excluir a pessoa permanentemente
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', deletingPerson.id);
      
      if (error) throw error;
      
      toast.success(`${deletingPerson.name} excluído permanentemente`);
      queryClient.invalidateQueries({ queryKey: ['organization-people', organization.id] });
      queryClient.invalidateQueries({ queryKey: ['organization', organization.id] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    } catch (error) {
      toast.error('Erro ao excluir pessoa');
    } finally {
      setIsDeleting(false);
      setDeletingPerson(null);
      setPersonLinkedInfo(null);
    }
  };
  
  const handleCloseDeleteDialog = (open: boolean) => {
    if (!open) {
      setDeletingPerson(null);
      setPersonLinkedInfo(null);
    }
  };

  const hasAddress = organization.address_street || organization.address_city;
  const hasInsuranceDetails = organization.insurance_branches?.length || 
    organization.current_insurer || 
    organization.policy_renewal_month ||
    organization.annual_premium_estimate;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">CNPJ</span>
            <span className="font-medium">{organization.cnpj ? formatCnpj(organization.cnpj) : '—'}</span>
          </div>
          
          {organization.phone && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Telefone
              </span>
              <a href={`tel:${organization.phone}`} className="font-medium text-primary hover:underline">
                {organization.phone}
              </a>
            </div>
          )}
          
          {organization.email && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </span>
              <div className="flex items-center gap-1">
                <a href={`mailto:${organization.email}`} className="font-medium text-primary hover:underline truncate max-w-[120px]">
                  {organization.email}
                </a>
                <EmailButton
                  entityType="organization"
                  entityId={organization.id}
                  entityName={organization.name}
                  recipientEmail={organization.email}
                  recipientName={organization.name}
                />
              </div>
            </div>
          )}
          
          {organization.website && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Website
              </span>
              <a 
                href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline truncate max-w-[150px]"
              >
                {organization.website}
              </a>
            </div>
          )}
          
          {organization.label && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary" className={getLabelColor(organization.label)}>
                {organization.label}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview Card */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Visão Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Atividades Pendentes</span>
            <Badge variant={pendingActivities > 0 ? 'default' : 'secondary'}>
              {pendingActivities}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Atividades Atrasadas</span>
            <Badge variant={overdueActivities > 0 ? 'destructive' : 'secondary'}>
              {overdueActivities}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Criado em
            </span>
            <span className="font-medium">
              {format(new Date(organization.created_at), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tempo de cadastro</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(organization.created_at), { locale: ptBR, addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Insurance Details Card */}
      {hasInsuranceDetails && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Detalhes do Seguro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {organization.insurance_branches && organization.insurance_branches.length > 0 && (
              <div>
                <span className="text-muted-foreground block mb-1">Ramos de Atuação</span>
                <div className="flex flex-wrap gap-1">
                  {organization.insurance_branches.map((branch, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {branch}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {organization.current_insurer && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Seguradora Atual</span>
                <span className="font-medium">{organization.current_insurer}</span>
              </div>
            )}
            
            {organization.policy_renewal_month && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mês Renovação</span>
                <span className="font-medium">{getMonthName(organization.policy_renewal_month)}</span>
              </div>
            )}
            
            {organization.annual_premium_estimate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Prêmio Anual Est.
                </span>
                <span className="font-medium text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(organization.annual_premium_estimate)}
                </span>
              </div>
            )}
            
            {organization.risk_profile && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Perfil de Risco</span>
                <Badge variant="outline">{organization.risk_profile}</Badge>
              </div>
            )}
            
            {organization.has_claims_history && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Sinistros
                </span>
                <Badge variant="destructive" className="text-xs">Histórico</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fleet Details */}
      {(organization.fleet_size || organization.automotores || organization.rntrc_antt) && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Frota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {organization.fleet_size && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tamanho da Frota</span>
                <span className="font-medium">{organization.fleet_size} veículos</span>
              </div>
            )}
            
            {organization.automotores && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Automotores</span>
                <span className="font-medium">{organization.automotores}</span>
              </div>
            )}
            
            {organization.fleet_type && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tipo de Frota</span>
                <span className="font-medium">{organization.fleet_type}</span>
              </div>
            )}
            
            {organization.rntrc_antt && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">RNTRC/ANTT</span>
                <span className="font-medium">{organization.rntrc_antt}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* People Card */}
      {people.length > 0 && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Pessoas ({people.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TooltipProvider>
              {people.map((person) => (
                <Tooltip key={person.id}>
                  <TooltipTrigger asChild>
                    <Link 
                      to={`/people/${person.id}`}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors block group"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{person.name}</span>
                          {person.is_primary && (
                            <Badge variant="secondary" className="text-xs">Principal</Badge>
                          )}
                        </div>
                        {person.job_title && (
                          <p className="text-xs text-muted-foreground">{person.job_title}</p>
                        )}
                        {person.phone && (
                          <p className="text-xs text-muted-foreground truncate">{person.phone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => handleEditPerson(e, person.id)}
                          disabled={isLoadingPerson}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setUnlinkingPerson(person);
                          }}
                        >
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={isCheckingLinks}
                          onClick={(e) => handleOpenDeleteDialog(e, person)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div className="space-y-1.5 py-1">
                      <p className="font-medium">{person.name}</p>
                      {person.job_title && (
                        <p className="text-xs text-muted-foreground">{person.job_title}</p>
                      )}
                      {person.email && (
                        <p className="text-xs flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground" /> 
                          {person.email}
                        </p>
                      )}
                      {person.phone && (
                        <p className="text-xs flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground" /> 
                          {person.phone}
                        </p>
                      )}
                      {person.whatsapp && (
                        <p className="text-xs flex items-center gap-1.5">
                          <MessageCircle className="h-3 w-3 text-muted-foreground" /> 
                          {person.whatsapp}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </CardContent>
        </Card>
      )}

      {/* Address Card */}
      {hasAddress && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">
              {organization.address_street}
              {organization.address_number && `, ${organization.address_number}`}
              {organization.address_complement && ` - ${organization.address_complement}`}
            </p>
            {organization.address_neighborhood && (
              <p className="text-muted-foreground">{organization.address_neighborhood}</p>
            )}
            {(organization.address_city || organization.address_state) && (
              <p className="text-muted-foreground">
                {organization.address_city}{organization.address_state && ` - ${organization.address_state}`}
              </p>
            )}
            {organization.address_zipcode && (
              <p className="text-muted-foreground">CEP: {organization.address_zipcode}</p>
            )}
          </CardContent>
        </Card>
      )}
      {/* Person Edit Sheet */}
      <PersonFormSheet
        open={!!editingPerson}
        onOpenChange={(open) => !open && setEditingPerson(null)}
        person={editingPerson}
        onSuccess={handleEditSuccess}
      />

      {/* Unlink Person Confirmation */}
      <AlertDialog open={!!unlinkingPerson} onOpenChange={(open) => !open && setUnlinkingPerson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular pessoa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desvincular <strong>{unlinkingPerson?.name}</strong> desta organização?
              A pessoa continuará no sistema, apenas não estará mais vinculada a esta organização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlinking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkPerson}
              disabled={isUnlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnlinking ? 'Desvinculando...' : 'Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Person Confirmation */}
      <AlertDialog open={!!deletingPerson} onOpenChange={handleCloseDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {personLinkedInfo && (personLinkedInfo.deals > 0 || personLinkedInfo.activities > 0)
                ? 'Atenção: Esta pessoa possui vínculos'
                : 'Excluir pessoa permanentemente?'
              }
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {personLinkedInfo && (personLinkedInfo.deals > 0 || personLinkedInfo.activities > 0) ? (
                  <div className="space-y-3">
                    <p>
                      <span className="font-medium text-foreground">"{deletingPerson?.name}"</span> está vinculado a:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {personLinkedInfo.deals > 0 && (
                        <li>{personLinkedInfo.deals} {personLinkedInfo.deals === 1 ? 'negócio' : 'negócios'}</li>
                      )}
                      {personLinkedInfo.activities > 0 && (
                        <li>{personLinkedInfo.activities} {personLinkedInfo.activities === 1 ? 'atividade' : 'atividades'}</li>
                      )}
                    </ul>
                    <p className="text-sm">
                      Ao excluir, esses registros perderão a referência a esta pessoa e ficarão sem pessoa de contato vinculada. Esta ação não pode ser desfeita.
                    </p>
                  </div>
                ) : (
                  <>
                    Tem certeza que deseja excluir <strong>{deletingPerson?.name}</strong> permanentemente?
                    Esta ação não pode ser desfeita.
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePerson}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : personLinkedInfo && (personLinkedInfo.deals > 0 || personLinkedInfo.activities > 0) ? (
                'Excluir mesmo assim'
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
