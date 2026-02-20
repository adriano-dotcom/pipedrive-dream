import { describe, it, expect } from 'vitest';
import { cn, formatCnpj } from '../utils';

describe('cn', () => {
  it('combina classes simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('resolve conflitos Tailwind', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('ignora valores falsy', () => {
    expect(cn('foo', false && 'bar', null, undefined, 'baz')).toBe('foo baz');
  });

  it('lida com condicionais', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });
});

describe('formatCnpj', () => {
  it('formata CNPJ com 14 dígitos corretamente', () => {
    expect(formatCnpj('12345678000190')).toBe('12.345.678/0001-90');
  });

  it('retorna string vazia para null', () => {
    expect(formatCnpj(null)).toBe('');
  });

  it('retorna string vazia para undefined', () => {
    expect(formatCnpj(undefined)).toBe('');
  });

  it('retorna string original se não tem 14 dígitos', () => {
    expect(formatCnpj('12345')).toBe('12345');
  });

  it('preserva CNPJ já formatado (remove não-numéricos antes)', () => {
    expect(formatCnpj('12.345.678/0001-90')).toBe('12.345.678/0001-90');
  });
});
