import Papa from 'papaparse';

// Renders each row as "col: value, col: value" lines so the RAG chunker can
// treat tabular data like prose without losing column context.
export async function parseCsv(file: File): Promise<string> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = result.data;
  return rows
    .map((row) =>
      Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', '),
    )
    .join('\n');
}
