import { PatternFormat, PatternFormatProps } from 'react-number-format';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface CnpjInputProps extends Omit<PatternFormatProps, 'format' | 'mask' | 'customInput' | 'onValueChange'> {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function CnpjInput({ value, onValueChange, className, ...props }: CnpjInputProps) {
  return (
    <PatternFormat
      format="##.###.###/####-##"
      mask="_"
      customInput={Input}
      value={value}
      onValueChange={(values) => onValueChange(values.value)}
      placeholder="00.000.000/0000-00"
      className={cn(className)}
      {...props}
    />
  );
}
