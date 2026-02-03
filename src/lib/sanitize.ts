import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows only safe HTML tags and attributes used by the rich text editor.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'ul', 'ol', 'li',
      'a', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code',
      'div',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'style', 'data-type', 'data-id', 'data-label',
    ],
    ALLOW_DATA_ATTR: true,
    // Force all links to be safe
    ADD_ATTR: ['target'],
    // Transform relative URLs to be safe
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Additional security measures
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}

/**
 * Sanitize plain text by escaping HTML entities.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
