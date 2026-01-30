import { PatternFormat, PatternFormatProps } from 'react-number-format';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<PatternFormatProps, 'format' | 'mask' | 'customInput' | 'onValueChange'> {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  onBlur?: () => void;
}

export function PhoneInput({ value, onValueChange, className, onBlur, ...props }: PhoneInputProps) {
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
