// Utility functions for importing CSV/Excel files

export interface ParsedRow {
  [key: string]: string;
}

export interface ImportColumn {
  id: string;
  label: string;
  required?: boolean;
  aliases: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportRow {
  index: number;
  data: ParsedRow;
  mappedData: Record<string, string>;
  status: 'valid' | 'warning' | 'error';
  messages: string[];
  selected: boolean;
}

// Person fields for mapping
export const PERSON_FIELDS: ImportColumn[] = [
  { id: 'name', label: 'Nome da Pessoa', required: true, aliases: ['nome', 'nome completo', 'contato', 'nome do contato'] },
  { id: 'cpf', label: 'CPF', aliases: ['cpf', 'cpf/cnpf', 'documento'] },
  { id: 'email', label: 'Email', aliases: ['email', 'e-mail', 'correio', 'email pessoal'] },
  { id: 'phone', label: 'Telefone', aliases: ['telefone', 'fone', 'tel', 'telefone pessoal'] },
  { id: 'whatsapp', label: 'WhatsApp', aliases: ['whatsapp', 'celular', 'cel', 'zap'] },
  { id: 'job_title', label: 'Cargo', aliases: ['cargo', 'função', 'funcao', 'profissão', 'profissao'] },
  { id: 'notes', label: 'Observações', aliases: ['observações', 'observacoes', 'notas', 'anotações'] },
  { id: 'label', label: 'Status/Temperatura', aliases: ['status', 'temperatura', 'etiqueta', 'label'] },
  { id: 'lead_source', label: 'Origem do Lead', aliases: ['origem', 'origem do lead', 'fonte', 'canal'] },
];

// Organization fields for mapping
export const ORGANIZATION_FIELDS: ImportColumn[] = [
  { id: 'org_name', label: 'Nome da Empresa', aliases: ['empresa', 'razão social', 'razao social', 'organização', 'organizacao', 'nome da empresa'] },
  { id: 'cnpj', label: 'CNPJ', aliases: ['cnpj', 'cnpj da empresa', 'cnpj empresa'] },
  { id: 'cnae', label: 'CNAE', aliases: ['cnae', 'código cnae', 'codigo cnae'] },
  { id: 'org_phone', label: 'Telefone da Empresa', aliases: ['telefone empresa', 'fone empresa', 'tel empresa'] },
  { id: 'org_email', label: 'Email da Empresa', aliases: ['email empresa', 'e-mail empresa'] },
  { id: 'automotores', label: 'Automotores/Frota', aliases: ['automotores', 'qtd veículos', 'qtd veiculos', 'frota', 'veículos', 'veiculos'] },
  { id: 'address_city', label: 'Cidade', aliases: ['cidade', 'municipio', 'município'] },
  { id: 'address_state', label: 'Estado', aliases: ['estado', 'uf'] },
  { id: 'address_zipcode', label: 'CEP', aliases: ['cep', 'código postal', 'codigo postal'] },
];

// All fields combined
export const ALL_IMPORT_FIELDS = [...PERSON_FIELDS, ...ORGANIZATION_FIELDS];

// Detect CSV separator
export function detectSeparator(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  if (tabCount > semicolonCount && tabCount > commaCount) return '\t';
  if (semicolonCount > commaCount) return ';';
  return ',';
}

// Remove BOM from content
export function removeBOM(content: string): string {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

// Parse CSV content
export function parseCSVContent(content: string): ParsedRow[] {
  const cleanContent = removeBOM(content);
  const separator = detectSeparator(cleanContent);
  const lines = cleanContent.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('O arquivo deve ter pelo menos um cabeçalho e uma linha de dados');
  }
  
  const headers = parseCSVLine(lines[0], separator).map(h => h.trim());
  const rows: ParsedRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], separator);
    const row: ParsedRow = {};
    
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim();
    });
    
    rows.push(row);
  }
  
  return rows;
}

// Parse a single CSV line handling quotes
function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Parse CSV file
export async function parseCSV(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rows = parseCSVContent(content);
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsText(file, 'UTF-8');
  });
}

// Parse Excel file (HTML table format or basic parsing)
export async function parseExcel(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // Try to parse as HTML table (our export format)
        if (content.includes('<table') || content.includes('<TABLE')) {
          const rows = parseHTMLTable(content);
          resolve(rows);
          return;
        }
        
        // Try to parse as CSV (some .xls files are actually CSV)
        const csvRows = parseCSVContent(content);
        resolve(csvRows);
      } catch (error) {
        reject(new Error('Formato de arquivo Excel não suportado. Use CSV ou o modelo fornecido.'));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsText(file, 'UTF-8');
  });
}

// Parse HTML table (from our Excel export)
function parseHTMLTable(content: string): ParsedRow[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const table = doc.querySelector('table');
  
  if (!table) {
    throw new Error('Nenhuma tabela encontrada no arquivo');
  }
  
  const rows = table.querySelectorAll('tr');
  if (rows.length < 2) {
    throw new Error('O arquivo deve ter pelo menos um cabeçalho e uma linha de dados');
  }
  
  const headerRow = rows[0];
  const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || '');
  
  const result: ParsedRow[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td');
    const row: ParsedRow = {};
    
    headers.forEach((header, index) => {
      row[header] = cells[index]?.textContent?.trim() || '';
    });
    
    result.push(row);
  }
  
  return result;
}

// Auto-detect column mapping based on header names
export function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const field of ALL_IMPORT_FIELDS) {
      if (field.aliases.some(alias => normalizedHeader.includes(alias))) {
        mapping[header] = field.id;
        break;
      }
    }
  });
  
  return mapping;
}

// Validate CPF format
export function validateCPF(cpf: string): boolean {
  if (!cpf) return true; // Optional field
  
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  
  // Check for repeated digits
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;
  
  return true;
}

// Validate CNPJ format
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return true; // Optional field
  
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  
  // Check for repeated digits
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validate check digits
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleaned[12])) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleaned[13])) return false;
  
  return true;
}

// Validate email format
export function validateEmail(email: string): boolean {
  if (!email) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate a single row
export function validateRow(mappedData: Record<string, string>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required field: name
  if (!mappedData.name?.trim()) {
    errors.push('Nome é obrigatório');
  }
  
  // Validate CPF if provided
  if (mappedData.cpf && !validateCPF(mappedData.cpf)) {
    warnings.push('CPF inválido');
  }
  
  // Validate CNPJ if provided
  if (mappedData.cnpj && !validateCNPJ(mappedData.cnpj)) {
    warnings.push('CNPJ inválido');
  }
  
  // Validate email if provided
  if (mappedData.email && !validateEmail(mappedData.email)) {
    warnings.push('Email inválido');
  }
  
  // Validate org email if provided
  if (mappedData.org_email && !validateEmail(mappedData.org_email)) {
    warnings.push('Email da empresa inválido');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Format CPF for display
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Format CNPJ for display
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Generate example CSV content
export function generateExampleCSV(): string {
  const headers = ['Nome', 'CPF', 'Email', 'Telefone', 'WhatsApp', 'Cargo', 'Empresa', 'CNPJ', 'Automotores', 'Cidade', 'Estado', 'Origem'];
  const rows = [
    ['João da Silva', '123.456.789-00', 'joao@email.com', '(11) 99999-9999', '(11) 99999-9999', 'Gerente', 'Transportes ABC', '12.345.678/0001-90', '25', 'São Paulo', 'SP', 'Indicação'],
    ['Maria Santos', '987.654.321-00', 'maria@email.com', '(21) 88888-8888', '(21) 88888-8888', 'Diretora', 'Logística XYZ', '98.765.432/0001-10', '50', 'Rio de Janeiro', 'RJ', 'Google'],
    ['Pedro Costa', '', 'pedro@email.com', '(31) 77777-7777', '', 'Analista', '', '', '', 'Belo Horizonte', 'MG', 'Site'],
  ];
  
  const BOM = '\uFEFF';
  const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
  
  return BOM + csvContent;
}

// Download example CSV
export function downloadExampleCSV(): void {
  const content = generateExampleCSV();
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo_importacao.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Clean phone number for storage
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Parse number from string
export function parseNumber(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/\D/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? null : parsed;
}
