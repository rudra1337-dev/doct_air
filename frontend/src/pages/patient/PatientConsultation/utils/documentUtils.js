/**
 * Formats a byte number into human-readable size string (B, KB, MB)
 *
 * @param {number} bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (!bytes || typeof bytes !== 'number' || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates a user-selected File object for PDF medical report uploads
 *
 * @param {File} file
 * @param {number} [maxMb=10]
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePdfFile(file, maxMb = 10) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    return { valid: false, error: 'Please upload a PDF medical report.' };
  }

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `This PDF is larger than the allowed file size of ${maxMb}MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected PDF file is empty.' };
  }

  return { valid: true };
}

export default {
  formatFileSize,
  validatePdfFile,
};
