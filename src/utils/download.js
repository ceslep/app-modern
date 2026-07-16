/**
 * Download utilities for various file formats
 */

/**
 * Trigger a file download from a Blob
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download text content as file
 */
export function downloadText(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Download JSON as file
 */
export function downloadJson(data, filename) {
  const content = JSON.stringify(data, null, 2);
  downloadText(content, filename, 'application/json');
}

/**
 * Download CSV from array of objects
 */
export function downloadCsv(data, filename, headers = null) {
  if (!data || data.length === 0) return;

  const keys = headers || Object.keys(data[0]);
  const csvRows = [
    keys.join(','),
    ...data.map((row) =>
      keys
        .map((key) => {
          let value = row[key] ?? '';
          value = String(value).replace(/"/g, '""');
          return `"${value}"`;
        })
        .join(',')
    ),
  ];

  const content = csvRows.join('\n');
  downloadText(content, filename, 'text/csv;charset=utf-8');
}

/**
 * Download HTML content as file
 */
export function downloadHtml(content, filename) {
  downloadText(content, filename, 'text/html');
}

/**
 * Force download from URL
 */
export async function forceDownload(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Print an element
 */
export function printElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Imprimir</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${element.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Share content using Web Share API
 */
export async function shareContent(title, text, url = null) {
  if (!navigator.share) {
    console.warn('Web Share API not supported');
    return false;
  }

  try {
    await navigator.share({ title, text, url: url || window.location.href });
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Share error:', error);
    }
    return false;
  }
}
