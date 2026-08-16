// PRD Section 9: split on paragraph boundaries first, then merge/split to
// target ~400 tokens per chunk with ~50 token overlap. We approximate
// tokens as ~4 characters each (close enough for chunk sizing; the
// embedding model does its own real tokenization).
const CHARS_PER_TOKEN = 4;
const TARGET_TOKENS = 400;
const OVERLAP_TOKENS = 50;
const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > TARGET_CHARS) {
      // Oversized paragraph: flush what we have, then hard-split it with overlap.
      pushCurrent();
      current = '';
      let start = 0;
      while (start < paragraph.length) {
        const end = Math.min(start + TARGET_CHARS, paragraph.length);
        chunks.push(paragraph.slice(start, end).trim());
        if (end >= paragraph.length) break;
        start = end - OVERLAP_CHARS;
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > TARGET_CHARS && current) {
      pushCurrent();
      // Carry the tail of the previous chunk forward as overlap.
      const overlapText = current.slice(Math.max(0, current.length - OVERLAP_CHARS));
      current = `${overlapText}\n\n${paragraph}`;
    } else {
      current = candidate;
    }
  }
  pushCurrent();

  return chunks.filter((c) => c.length > 0);
}
