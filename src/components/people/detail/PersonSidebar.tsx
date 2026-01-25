import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Calendar, 
  Clock,
  Briefcase,
  MapPin,
  MessageCircle,
  Tag,
  Unlink,
  Link2,
  Plus,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { EmailButton } from '@/components/email/EmailButton';
import { OrganizationFormSheet } from '@/components/organizations/OrganizationFormSheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PersonSidebarProps {
  person: {
    id: string;
    name: string;
    cpf: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    job_title: string | null;
    label: string | null;
    notes: string | null;
    lead_source: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    created_at: string;
    organization?: {
      id: string;
      name: string;
      cnpj: string | null;
      address_city: string | null;
      address_state: string | null;
    } | null;
  };
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

export function PersonSidebar({ 
  person, 
  pendingActivities,
  overdueActivities,
}: PersonSidebarProps) {
  const queryClient = useQueryClient();
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  const [showNewOrgSheet, setShowNewOrgSheet] = useState(false);
  const [orgSearchOpen, setOrgSearchOpen] = useState(false);
  
  const hasLeadSource = person.lead_source || person.utm_source || person.utm_medium || person.utm_campaign;

  // Query para buscar organizações disponíveis
  const { data: organizations = [], refetch: refetchOrganizations } = useQuery({
    queryKey: ['organizations-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: showLinkDialog || showNewOrgSheet,
  });

  const handleLinkToOrganization = async () => {
    if (!selectedOrgId) {
      toast.error('Selecione uma organização');
      return;
    }
    
    setIsLinking(true);
    try {
      const { error } = await supabase
        .from('people')
        .update({ organization_id: selectedOrgId })
        .eq('id', person.id);
      
      if (error) throw error;
      
      toast.success('Pessoa vinculada à organização');
      queryClient.invalidateQueries({ queryKey: ['person', person.id] });
      setShowLinkDialog(false);
      setSelectedOrgId('');
    } catch (error) {
      console.error('Error linking person:', error);
      toast.error('Erro ao vincular à organização');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkFromOrganization = async () => {
    if (!person.organization) return;
    
    setIsUnlinking(true);
    try {
      // Verificar se a pessoa é o contato principal e limpar se necessário
      const { data: org } = await supabase
        .from('organizations')
        .select('primary_contact_id')
        .eq('id', person.organization.id)
        .maybeSingle();
      
      if (org?.primary_contact_id === person.id) {
        await supabase
          .from('organizations')
          .update({ primary_contact_id: null })
          .eq('id', person.organization.id);
      }
      
      // Desvincular a pessoa
      const { error } = await supabase
        .from('people')
        .update({ organization_id: null })
        .eq('id', person.id);
      
      if (error) throw error;
      
      toast.success('Pessoa desvinculada da organização');
      queryClient.invalidateQueries({ queryKey: ['person', person.id] });
    } catch (error) {
      console.error('Error unlinking person:', error);
      toast.error('Erro ao desvincular da organização');
    } finally {
      setIsUnlinking(false);
      setShowUnlinkDialog(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {person.cpf && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">CPF</span>
              <span className="font-medium">{person.cpf}</span>
            </div>
          )}
          
          {person.phone && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Telefone
              </span>
              <a href={`tel:${person.phone}`} className="font-medium text-primary hover:underline">
                {person.phone}
              </a>
            </div>
          )}

          {person.whatsapp && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </span>
              <a 
                href={`https://wa.me/${person.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {person.whatsapp}
              </a>
            </div>
          )}
          
          {person.email && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </span>
              <div className="flex items-center gap-1">
                <a href={`mailto:${person.email}`} className="font-medium text-primary hover:underline truncate max-w-[120px]">
                  {person.email}
                </a>
                <EmailButton
                  entityType="person"
                  entityId={person.id}
                  entityName={person.name}
                  recipientEmail={person.email}
                  recipientName={person.name}
                />
              </div>
            </div>
          )}

          {person.job_title && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Cargo
              </span>
              <span className="font-medium">{person.job_title}</span>
            </div>
          )}
          
          {person.label && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary" className={getLabelColor(person.label)}>
                {person.label}
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
              {format(new Date(person.created_at), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tempo de cadastro</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(person.created_at), { locale: ptBR, addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Organization Card */}
      {person.organization ? (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Organização
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setShowUnlinkDialog(true)}
                    >
                      <Unlink className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Desvincular da organização</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Link 
              to={`/organizations/${person.organization.id}`}
              className="block p-3 rounded-lg hover:bg-muted/50 transition-colors -mx-3"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary hover:underline truncate">
                    {person.organization.name}
                  </p>
                  {person.organization.cnpj && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {person.organization.cnpj}
                    </p>
                  )}
                  {(person.organization.address_city || person.organization.address_state) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {person.organization.address_city}
                      {person.organization.address_state && ` - ${person.organization.address_state}`}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass border-border/50 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Organização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setShowLinkDialog(true)}
            >
              <Link2 className="h-4 w-4" />
              Vincular a uma organização
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lead Source Card */}
      {hasLeadSource && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Origem do Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {person.lead_source && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Origem</span>
                <span className="font-medium">{person.lead_source}</span>
              </div>
            )}
            {person.utm_source && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">UTM Source</span>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                  {person.utm_source}
                </span>
              </div>
            )}
            {person.utm_medium && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">UTM Medium</span>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                  {person.utm_medium}
                </span>
              </div>
            )}
            {person.utm_campaign && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">UTM Campaign</span>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                  {person.utm_campaign}
                </span>
              </div>
            )}
            </CardContent>
        </Card>
      )}

      {/* Unlink from Organization Confirmation */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular da organização?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desvincular <strong>{person.name}</strong> da organização <strong>{person.organization?.name}</strong>?
              A pessoa continuará no sistema, apenas não estará mais vinculada a esta organização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlinking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkFromOrganization}
              disabled={isUnlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnlinking ? 'Desvinculando...' : 'Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link to Organization Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={(open) => {
        setShowLinkDialog(open);
        if (!open) setSelectedOrgId('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a uma organização</DialogTitle>
            <DialogDescription>
              Selecione a organização à qual deseja vincular <strong>{person.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Organização</Label>
              <Popover open={orgSearchOpen} onOpenChange={setOrgSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={orgSearchOpen}
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {selectedOrgId
                        ? organizations.find((org) => org.id === selectedOrgId)?.name
                        : 'Selecione uma organização...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar organização..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma organização encontrada.</CommandEmpty>
                      <CommandGroup>
                        {organizations.map((org) => (
                          <CommandItem
                            key={org.id}
                            value={org.name}
                            onSelect={() => {
                              setSelectedOrgId(org.id);
                              setOrgSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedOrgId === org.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {org.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowNewOrgSheet(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar nova organização
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)} disabled={isLinking}>
              Cancelar
            </Button>
            <Button onClick={handleLinkToOrganization} disabled={isLinking || !selectedOrgId}>
              {isLinking ? 'Vinculando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Organization Sheet */}
      <OrganizationFormSheet
        open={showNewOrgSheet}
        onOpenChange={(open) => {
          setShowNewOrgSheet(open);
          if (!open) {
            refetchOrganizations();
          }
        }}
        organization={null}
      />
    </div>
  );
}
