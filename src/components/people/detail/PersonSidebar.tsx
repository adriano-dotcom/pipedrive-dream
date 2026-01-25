import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
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
  const hasLeadSource = person.lead_source || person.utm_source || person.utm_medium || person.utm_campaign;

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
              <a href={`mailto:${person.email}`} className="font-medium text-primary hover:underline truncate max-w-[150px]">
                {person.email}
              </a>
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
      {person.organization && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Organização
            </CardTitle>
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
    </div>
  );
}
