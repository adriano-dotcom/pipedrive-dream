import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  
  // Remove caracteres não numéricos
  const digits = cnpj.replace(/\D/g, '');
  
  // Se não tem 14 dígitos, retorna como está
  if (digits.length !== 14) return cnpj;
  
  // Formata: ##.###.###/####-##
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}
