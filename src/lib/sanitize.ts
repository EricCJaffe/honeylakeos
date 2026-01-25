import DOMPurify from "dompurify";

/**
 * Allowed HTML tags for rich text content
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
];

/**
 * Allowed attributes for rich text content
 */
const ALLOWED_ATTR = ["href", "target", "rel"];

/**
 * Configure DOMPurify for rich text
 */
function configurePurify() {
  // Force all links to open in new tab with security attributes
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

// Initialize configuration
configurePurify();

/**
 * Sanitize HTML content for safe rendering
 * @param html - Raw HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Check if content appears to be HTML (has any tags)
 */
export function isHtmlContent(content: string | null | undefined): boolean {
  if (!content) return false;
  // Simple check for HTML-like content
  return /<[a-z][\s\S]*>/i.test(content);
}

/**
 * Convert plain text to safe HTML (escape and preserve line breaks)
 */
export function plainTextToHtml(text: string | null | undefined): string {
  if (!text) return "";

  // Escape HTML entities
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Convert line breaks to <br> and wrap in paragraph
  return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
}

/**
 * Strip all HTML tags and return plain text
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";

  const temp = document.createElement("div");
  temp.innerHTML = sanitizeHtml(html);
  return temp.textContent || temp.innerText || "";
}

/**
 * Get a plain text excerpt from HTML content
 * @param html - HTML content
 * @param maxLength - Maximum length of excerpt
 */
export function getExcerpt(
  html: string | null | undefined,
  maxLength: number = 100
): string {
  const text = htmlToPlainText(html);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}
