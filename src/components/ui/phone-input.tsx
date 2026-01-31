import { PatternFormat, PatternFormatProps } from 'react-number-format';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<PatternFormatProps, 'format' | 'mask' | 'customInput' | 'onValueChange'> {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  onBlur?: () => void;
}

// Verifica se o valor pode ser formatado com a máscara brasileira
function canUseBrazilianMask(value: string | null | undefined): boolean {
  if (!value) return true; // Valores vazios podem usar máscara
  
  // Se contém separadores (múltiplos telefones), não usar máscara
  if (value.includes(',') || value.includes(';')) return false;
  
  // Extrair apenas dígitos
  const digits = value.replace(/\D/g, '');
  
  // Telefone brasileiro tem 10-11 dígitos (com DDD) ou 12-13 (com código país)
  // Se tem mais que isso, provavelmente é formato especial
  if (digits.length > 13) return false;
  
  return true;
}

export function PhoneInput({ value, onValueChange, className, onBlur, ...props }: PhoneInputProps) {
  // Se o valor não pode usar máscara brasileira, usar input simples
  if (!canUseBrazilianMask(value)) {
    return (
      <Input
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Telefone"
        className={cn(className)}
        {...props}
      />
    );
  }

  return (
    <PatternFormat
      format="(##) #####-####"
      mask="_"
      customInput={Input}
      value={value}
      onValueChange={(values) => onValueChange(values.value)}
      onBlur={onBlur}
      placeholder="(00) 00000-0000"
      className={cn(className)}
      {...props}
    />
  );
}
