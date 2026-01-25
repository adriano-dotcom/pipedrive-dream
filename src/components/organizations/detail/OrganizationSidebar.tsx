import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OrganizationPerson } from '@/hooks/useOrganizationDetails';

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
            <span className="font-medium">{organization.cnpj || '—'}</span>
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
              <a href={`mailto:${organization.email}`} className="font-medium text-primary hover:underline truncate max-w-[150px]">
                {organization.email}
              </a>
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
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors block"
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
    </div>
  );
}
