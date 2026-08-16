import * as pdfjsLib from 'pdfjs-dist';

// `new URL(..., import.meta.url)` resolves reliably under both Vite dev
// server and production build; the `?url` suffix import was resolving to a
// worker script that failed to initialize ("Setting up fake worker failed").
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

export async function parsePdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    pageTexts.push(text);
  }

  await doc.destroy();
  return pageTexts.join('\n\n');
}
