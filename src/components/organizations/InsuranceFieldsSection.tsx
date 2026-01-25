import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const INSURANCE_BRANCHES = [
  { value: 'carga', label: 'Carga (RCTR-C, RCF-DC)' },
  { value: 'auto', label: 'Auto (Frota)' },
  { value: 'vida', label: 'Vida em Grupo' },
  { value: 'saude', label: 'Saúde Empresarial' },
  { value: 'rc', label: 'Responsabilidade Civil' },
  { value: 'do', label: 'D&O' },
  { value: 'patrimonial', label: 'Patrimonial' },
  { value: 'garantia', label: 'Garantia' },
  { value: 'transporte_int', label: 'Transporte Internacional' },
  { value: 'equipamentos', label: 'Equipamentos' },
];

const INSURERS = [
  'Porto Seguro',
  'Tokio Marine',
  'HDI Seguros',
  'Liberty Seguros',
  'Mapfre',
  'Bradesco Seguros',
  'SulAmérica',
  'Allianz',
  'Zurich',
  'Sompo',
  'Chubb',
  'AXA',
];

const FLEET_TYPES = [
  { value: 'propria', label: 'Própria' },
  { value: 'terceirizada', label: 'Terceirizada' },
  { value: 'mista', label: 'Mista (Própria + Terceiros)' },
  { value: 'agregados', label: 'Agregados' },
  { value: 'autonomos', label: 'Autônomos' },
];

const RISK_PROFILES = [
  { value: 'baixo', label: 'Baixo' },
  { value: 'medio', label: 'Médio' },
  { value: 'alto', label: 'Alto' },
];

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

interface InsuranceFieldsSectionProps {
  insuranceBranches: string[];
  preferredInsurers: string[];
  fleetType: string;
  fleetSize: string;
  currentInsurer: string;
  policyRenewalMonth: string;
  annualPremiumEstimate: string;
  riskProfile: string;
  hasClaimsHistory: boolean;
  brokerNotes: string;
  onInsuranceBranchesChange: (branches: string[]) => void;
  onPreferredInsurersChange: (insurers: string[]) => void;
  onFleetTypeChange: (value: string) => void;
  onFleetSizeChange: (value: string) => void;
  onCurrentInsurerChange: (value: string) => void;
  onPolicyRenewalMonthChange: (value: string) => void;
  onAnnualPremiumEstimateChange: (value: string) => void;
  onRiskProfileChange: (value: string) => void;
  onHasClaimsHistoryChange: (value: boolean) => void;
  onBrokerNotesChange: (value: string) => void;
}

export function InsuranceFieldsSection({
  insuranceBranches,
  preferredInsurers,
  fleetType,
  fleetSize,
  currentInsurer,
  policyRenewalMonth,
  annualPremiumEstimate,
  riskProfile,
  hasClaimsHistory,
  brokerNotes,
  onInsuranceBranchesChange,
  onPreferredInsurersChange,
  onFleetTypeChange,
  onFleetSizeChange,
  onCurrentInsurerChange,
  onPolicyRenewalMonthChange,
  onAnnualPremiumEstimateChange,
  onRiskProfileChange,
  onHasClaimsHistoryChange,
  onBrokerNotesChange,
}: InsuranceFieldsSectionProps) {
  const toggleBranch = (branch: string) => {
    if (insuranceBranches.includes(branch)) {
      onInsuranceBranchesChange(insuranceBranches.filter((b) => b !== branch));
    } else {
      onInsuranceBranchesChange([...insuranceBranches, branch]);
    }
  };

  const toggleInsurer = (insurer: string) => {
    if (preferredInsurers.includes(insurer)) {
      onPreferredInsurersChange(preferredInsurers.filter((i) => i !== insurer));
    } else {
      onPreferredInsurersChange([...preferredInsurers, insurer]);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Informações de Seguros
      </h3>

      {/* Insurance Branches - Multi-select checkboxes */}
      <div className="space-y-2">
        <Label>Ramos a Contratar</Label>
        <div className="grid grid-cols-2 gap-2">
          {INSURANCE_BRANCHES.map((branch) => (
            <div key={branch.value} className="flex items-center space-x-2">
              <Checkbox
                id={`branch-${branch.value}`}
                checked={insuranceBranches.includes(branch.value)}
                onCheckedChange={() => toggleBranch(branch.value)}
              />
              <label
                htmlFor={`branch-${branch.value}`}
                className="text-sm cursor-pointer"
              >
                {branch.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Preferred Insurers - Multi-select checkboxes */}
      <div className="space-y-2">
        <Label>Seguradoras Preferenciais</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INSURERS.map((insurer) => (
            <div key={insurer} className="flex items-center space-x-2">
              <Checkbox
                id={`insurer-${insurer}`}
                checked={preferredInsurers.includes(insurer)}
                onCheckedChange={() => toggleInsurer(insurer)}
              />
              <label
                htmlFor={`insurer-${insurer}`}
                className="text-sm cursor-pointer"
              >
                {insurer}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Fleet Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fleet_type">Tipo de Frota</Label>
          <Select value={fleetType} onValueChange={onFleetTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {FLEET_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fleet_size">Tamanho da Frota</Label>
          <Input
            id="fleet_size"
            type="number"
            value={fleetSize}
            onChange={(e) => onFleetSizeChange(e.target.value)}
            placeholder="Ex: 25 veículos"
          />
        </div>
      </div>

      {/* Current Insurer and Renewal */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="current_insurer">Seguradora Atual</Label>
          <Input
            id="current_insurer"
            value={currentInsurer}
            onChange={(e) => onCurrentInsurerChange(e.target.value)}
            placeholder="Ex: Porto Seguro"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="policy_renewal_month">Mês de Renovação</Label>
          <Select value={policyRenewalMonth} onValueChange={onPolicyRenewalMonthChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Premium Estimate and Risk */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="annual_premium_estimate">Estimativa de Prêmio Anual (R$)</Label>
          <Input
            id="annual_premium_estimate"
            type="number"
            value={annualPremiumEstimate}
            onChange={(e) => onAnnualPremiumEstimateChange(e.target.value)}
            placeholder="Ex: 150000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="risk_profile">Perfil de Risco</Label>
          <Select value={riskProfile} onValueChange={onRiskProfileChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {RISK_PROFILES.map((profile) => (
                <SelectItem key={profile.value} value={profile.value}>
                  {profile.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Claims History */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="has_claims_history"
          checked={hasClaimsHistory}
          onCheckedChange={(checked) => onHasClaimsHistoryChange(checked === true)}
        />
        <label htmlFor="has_claims_history" className="text-sm cursor-pointer">
          Possui histórico de sinistros
        </label>
      </div>

      {/* Broker Notes */}
      <div className="space-y-2">
        <Label htmlFor="broker_notes">Notas do Corretor</Label>
        <Textarea
          id="broker_notes"
          value={brokerNotes}
          onChange={(e) => onBrokerNotesChange(e.target.value)}
          placeholder="Informações específicas para a equipe comercial..."
          rows={3}
        />
      </div>
    </div>
  );
}
