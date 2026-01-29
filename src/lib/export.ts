/**
 * Export utility functions for CSV and Excel export
 * - CSV: UTF-8 with BOM for proper accent support in Excel
 * - Excel: HTML table format with .xls extension (compatible with Excel/LibreOffice)
 */

export interface ExportColumn {
  id: string;
  label: string;
  accessor: (row: any) => string | number | null | undefined;
}

/**
 * Format a value for export (handles null, undefined, dates, etc.)
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toLocaleDateString('pt-BR');
  }
  return String(value);
}

/**
 * Escape a value for CSV (handles quotes, semicolons, and newlines)
 */
function escapeCSVValue(value: string): string {
  // If value contains semicolon, quotes, or newlines, wrap in quotes
  if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    // Escape existing quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download a file with the given content
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a timestamp string for filenames
 */
function getTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Export data to CSV format
 * Uses UTF-8 with BOM for proper accent support in Excel
 * Uses semicolon separator (Brazilian locale standard)
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn[],
  filenamePrefix: string
): void {
  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  
  // Create header row
  const headers = columns.map(col => escapeCSVValue(col.label)).join(';');
  
  // Create data rows
  const rows = data.map(row => {
    return columns
      .map(col => {
        const value = col.accessor(row);
        return escapeCSVValue(formatValue(value));
      })
      .join(';');
  });
  
  // Combine with newlines
  const csvContent = BOM + [headers, ...rows].join('\r\n');
  
  // Download
  const filename = `${filenamePrefix}_${getTimestamp()}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
}

/**
 * Export data to Excel format (HTML table with .xls extension)
 * This format is widely compatible with Excel, LibreOffice, and Google Sheets
 */
export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn[],
  filenamePrefix: string
): void {
  // Create HTML table
  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${columns.map(col => {
                  const value = col.accessor(row);
                  return `<td>${escapeHtml(formatValue(value))}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  // Download
  const filename = `${filenamePrefix}_${getTimestamp()}.xls`;
  downloadFile(htmlContent, filename, 'application/vnd.ms-excel;charset=utf-8');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}
