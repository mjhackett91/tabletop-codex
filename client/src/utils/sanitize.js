// client/src/utils/sanitize.js - XSS protection utilities
import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 * TipTap editor output is generally safe, but we sanitize for extra protection
 * @param {string} html - HTML string to sanitize
 * @returns {string} - Sanitized HTML string
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== "string") {
    return "";
  }
  
  // Allow HTML from rich text editor, but remove dangerous elements
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "code", "pre", "a", "span", "div"
    ],
    ALLOWED_ATTR: ["href", "title", "class", "data-*"],
    ALLOW_DATA_ATTR: true
  });
}

/**
 * Sanitize plain text (strip all HTML)
 * @param {string} text - Text to sanitize
 * @returns {string} - Plain text
 */
export function sanitizeText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }
  
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}
