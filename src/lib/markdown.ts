import DOMPurify from 'dompurify';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Minimal, dependency-free markdown → HTML for model output: bold, inline
 * code, and paragraph breaks. Everything is escaped first, then run through
 * DOMPurify before it's ever handed to the DOM (PRD Section 9/14): model
 * output is untrusted content.
 */
export function renderModelOutput(raw: string): string {
  const escaped = escapeHtml(raw);
  const withInline = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  const withParagraphs = withInline
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return DOMPurify.sanitize(withParagraphs, { ALLOWED_TAGS: ['p', 'br', 'strong', 'code'] });
}
