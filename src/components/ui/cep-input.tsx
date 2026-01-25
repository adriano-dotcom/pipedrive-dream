import { PatternFormat, PatternFormatProps } from 'react-number-format';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface CepInputProps extends Omit<PatternFormatProps, 'format' | 'mask' | 'customInput' | 'onValueChange'> {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function CepInput({ value, onValueChange, className, ...props }: CepInputProps) {
  return (
    <PatternFormat
      format="#####-###"
      mask="_"
      customInput={Input}
      value={value}
      onValueChange={(values) => onValueChange(values.value)}
      placeholder="00000-000"
      className={cn(className)}
      {...props}
    />
  );
}
