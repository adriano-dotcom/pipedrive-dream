import { PatternFormat, PatternFormatProps } from 'react-number-format';
import { Input } from './input';

interface CpfInputProps extends Omit<PatternFormatProps, 'format' | 'mask' | 'customInput' | 'onValueChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

export function CpfInput({ value, onValueChange, ...props }: CpfInputProps) {
  return (
    <PatternFormat
      format="###.###.###-##"
      mask="_"
      customInput={Input}
      value={value}
      onValueChange={(values) => onValueChange(values.value)}
      placeholder="000.000.000-00"
      {...props}
    />
  );
}
