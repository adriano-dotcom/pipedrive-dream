import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date;
  to: Date;
}

interface PerformanceFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

type PresetOption = '7' | '30' | '60' | '90' | 'this-month' | 'last-month' | 'custom';

export function PerformanceFilters({ dateRange, onDateRangeChange }: PerformanceFiltersProps) {
  const [preset, setPreset] = useState<PresetOption>('30');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePresetChange = (value: PresetOption) => {
    setPreset(value);
    
    const today = new Date();
    let newRange: DateRange;

    switch (value) {
      case '7':
        newRange = { from: subDays(today, 7), to: today };
        break;
      case '30':
        newRange = { from: subDays(today, 30), to: today };
        break;
      case '60':
        newRange = { from: subDays(today, 60), to: today };
        break;
      case '90':
        newRange = { from: subDays(today, 90), to: today };
        break;
      case 'this-month':
        newRange = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        newRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        break;
      case 'custom':
        setIsCustomOpen(true);
        return;
      default:
        return;
    }

    onDateRangeChange(newRange);
  };

  const handleCustomDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onDateRangeChange({ from: range.from, to: range.to });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Últimos 7 dias</SelectItem>
          <SelectItem value="30">Últimos 30 dias</SelectItem>
          <SelectItem value="60">Últimos 60 dias</SelectItem>
          <SelectItem value="90">Últimos 90 dias</SelectItem>
          <SelectItem value="this-month">Este mês</SelectItem>
          <SelectItem value="last-month">Mês passado</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                <span>Selecionar período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={handleCustomDateSelect}
              numberOfMonths={2}
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      <div className="text-sm text-muted-foreground">
        {format(dateRange.from, "dd 'de' MMMM", { locale: ptBR })} a{' '}
        {format(dateRange.to, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </div>
    </div>
  );
}
