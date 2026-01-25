import { Building2, User, Phone, Mail, Briefcase, Calendar, Percent, DollarSign, Shield, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface DealSidebarProps {
  deal: {
    id: string;
    title: string;
    value: number | null;
    probability: number | null;
    expected_close_date: string | null;
    insurance_type: string | null;
    insurer: string | null;
    policy_number: string | null;
    commission_percent: number | null;
    commission_value: number | null;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
    organization?: { id: string; name: string; phone: string | null; email: string | null } | null;
    person?: { id: string; name: string; phone: string | null; email: string | null; job_title: string | null } | null;
    stage?: { name: string; probability: number | null } | null;
    pipeline?: { name: string } | null;
  };
}

function formatCurrency(value: number | null) {
  if (!value) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function SidebarSection({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = true 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg transition-colors">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-muted-foreground">{label}:</span>
        <span className="ml-1 text-foreground">{value}</span>
      </div>
    </div>
  );
}

export function DealSidebar({ deal }: DealSidebarProps) {
  return (
    <div className="space-y-2 bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      {/* Person Section */}
      {deal.person && (
        <SidebarSection title="Pessoa" icon={User}>
          <div className="space-y-1">
            <Link 
              to={`/people/${deal.person.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
            >
              {deal.person.name}
            </Link>
            {deal.person.job_title && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                {deal.person.job_title}
              </div>
            )}
            {deal.person.phone && (
              <a href={`tel:${deal.person.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-3.5 w-3.5" />
                {deal.person.phone}
              </a>
            )}
            {deal.person.email && (
              <a href={`mailto:${deal.person.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors truncate">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{deal.person.email}</span>
              </a>
            )}
          </div>
        </SidebarSection>
      )}

      {/* Organization Section */}
      {deal.organization && (
        <SidebarSection title="Organização" icon={Building2}>
          <div className="space-y-1">
            <Link 
              to={`/organizations/${deal.organization.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
            >
              {deal.organization.name}
            </Link>
            {deal.organization.phone && (
              <a href={`tel:${deal.organization.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-3.5 w-3.5" />
                {deal.organization.phone}
              </a>
            )}
            {deal.organization.email && (
              <a href={`mailto:${deal.organization.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors truncate">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{deal.organization.email}</span>
              </a>
            )}
          </div>
        </SidebarSection>
      )}

      {/* Deal Summary */}
      <SidebarSection title="Resumo" icon={DollarSign}>
        <div className="space-y-0.5">
          <InfoRow label="Funil" value={deal.pipeline?.name} />
          <InfoRow label="Etapa" value={deal.stage?.name} />
          <InfoRow label="Valor" value={formatCurrency(deal.value)} icon={DollarSign} />
          <InfoRow label="Probabilidade" value={deal.probability ? `${deal.probability}%` : null} icon={Percent} />
          <InfoRow 
            label="Fechamento previsto" 
            value={deal.expected_close_date ? format(new Date(deal.expected_close_date), "dd 'de' MMMM", { locale: ptBR }) : null} 
            icon={Calendar} 
          />
        </div>
      </SidebarSection>

      {/* Insurance Details */}
      <SidebarSection title="Detalhes do Seguro" icon={Shield} defaultOpen={false}>
        <div className="space-y-0.5">
          <InfoRow label="Tipo" value={deal.insurance_type} />
          <InfoRow label="Seguradora" value={deal.insurer} />
          <InfoRow label="Nº Apólice" value={deal.policy_number} icon={FileText} />
          <InfoRow label="Comissão %" value={deal.commission_percent ? `${deal.commission_percent}%` : null} />
          <InfoRow label="Comissão R$" value={deal.commission_value ? formatCurrency(deal.commission_value) : null} />
          {deal.start_date && (
            <InfoRow 
              label="Vigência início" 
              value={format(new Date(deal.start_date), 'dd/MM/yyyy')} 
              icon={Calendar} 
            />
          )}
          {deal.end_date && (
            <InfoRow 
              label="Vigência fim" 
              value={format(new Date(deal.end_date), 'dd/MM/yyyy')} 
              icon={Calendar} 
            />
          )}
        </div>
      </SidebarSection>

      {/* Notes */}
      {deal.notes && (
        <SidebarSection title="Observações" icon={FileText} defaultOpen={false}>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{deal.notes}</p>
        </SidebarSection>
      )}
    </div>
  );
}
