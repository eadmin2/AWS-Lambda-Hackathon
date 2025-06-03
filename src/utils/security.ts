/**
 * Security utility functions
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * 
 * @param input - User provided string input
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validates file type for secure file uploads
 * 
 * @param file - File object to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns Boolean indicating if file is valid
 */
export const validateFileType = (
  file: File, 
  allowedTypes: string[] = ['application/pdf', 'image/jpeg', 'image/png']
): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * Validates file size for secure file uploads
 * 
 * @param file - File object to validate
 * @param maxSizeInBytes - Maximum allowed file size in bytes (default: 5MB)
 * @returns Boolean indicating if file size is valid
 */
export const validateFileSize = (
  file: File,
  maxSizeInBytes: number = 5 * 1024 * 1024
): boolean => {
  return file.size <= maxSizeInBytes;
};

/**
 * Creates a Content Security Policy nonce for inline scripts
 * Use this for any dynamically generated inline scripts that need to be allowed by CSP
 * 
 * @returns Random nonce string
 */
export const generateCSPNonce = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}; 