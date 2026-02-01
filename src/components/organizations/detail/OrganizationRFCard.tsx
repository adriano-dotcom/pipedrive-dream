import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Calendar, DollarSign, FileText, MapPin, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrganizationRFData {
  trade_name?: string | null;
  company_size?: string | null;
  branch_type?: string | null;
  legal_nature_code?: string | null;
  legal_nature?: string | null;
  founded_date?: string | null;
  share_capital?: number | null;
  registration_status?: string | null;
  registration_status_date?: string | null;
  last_enriched_at?: string | null;
  enrichment_source?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface OrganizationRFCardProps {
  organization: OrganizationRFData;
}

const getStatusBadgeVariant = (status: string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!status) return 'secondary';
  const statusLower = status.toLowerCase();
  if (statusLower.includes('ativa')) return 'default';
  if (statusLower.includes('baixada') || statusLower.includes('inapta') || statusLower.includes('suspens')) return 'destructive';
  return 'outline';
};

export function OrganizationRFCard({ organization }: OrganizationRFCardProps) {
  const hasRFData = organization.last_enriched_at || organization.trade_name || 
    organization.company_size || organization.share_capital;

  if (!hasRFData) {
    return null;
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Dados da Receita Federal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {organization.trade_name && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1">
              <Building className="h-3 w-3" /> Nome Fantasia
            </span>
            <span className="font-medium text-right max-w-[60%] truncate">
              {organization.trade_name}
            </span>
          </div>
        )}

        {organization.registration_status && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Situação Cadastral</span>
            <Badge variant={getStatusBadgeVariant(organization.registration_status)}>
              {organization.registration_status}
            </Badge>
          </div>
        )}

        {organization.company_size && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Porte</span>
            <Badge variant="outline">{organization.company_size}</Badge>
          </div>
        )}

        {organization.branch_type && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tipo</span>
            <span className="font-medium">{organization.branch_type}</span>
          </div>
        )}

        {organization.legal_nature && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground">Natureza Jurídica</span>
            <span className="font-medium text-right text-xs max-w-[60%]">
              {organization.legal_nature}
            </span>
          </div>
        )}

        {organization.founded_date && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Data Abertura
            </span>
            <span className="font-medium">
              {format(new Date(organization.founded_date), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
        )}

        {organization.share_capital && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Capital Social
            </span>
            <span className="font-medium text-primary">
              {formatCurrency(organization.share_capital)}
            </span>
          </div>
        )}

        {organization.latitude && organization.longitude && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Coordenadas
            </span>
            <a 
              href={`https://www.google.com/maps?q=${organization.latitude},${organization.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Ver no mapa
            </a>
          </div>
        )}

        {organization.last_enriched_at && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Atualizado
              </span>
              <span>
                {formatDistanceToNow(new Date(organization.last_enriched_at), { 
                  locale: ptBR, 
                  addSuffix: true 
                })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
