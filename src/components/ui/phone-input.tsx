import { PatternFormat, PatternFormatProps } from 'react-number-format';
import { Input } from './input';

interface PhoneInputProps extends Omit<PatternFormatProps, 'format' | 'mask' | 'customInput' | 'onValueChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

export function PhoneInput({ value, onValueChange, ...props }: PhoneInputProps) {
  return (
    <PatternFormat
      format="(##) #####-####"
      mask="_"
      customInput={Input}
      value={value}
      onValueChange={(values) => onValueChange(values.value)}
      placeholder="(00) 00000-0000"
      {...props}
    />
  );
}
