import type { FileType } from '@/types';
import { parseCsv } from './csv';
import { parseDocx } from './docx';
import { parsePdf } from './pdf';
import { parseTxt } from './txt';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB, PRD Section 14

const EXTENSION_MAP: Record<string, FileType> = {
  pdf: 'pdf',
  docx: 'docx',
  csv: 'csv',
  tsv: 'csv',
  txt: 'txt',
};

export class UnsupportedFileError extends Error {}
export class FileTooLargeError extends Error {}

export function detectFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const type = EXTENSION_MAP[ext];
  if (!type) {
    throw new UnsupportedFileError(
      `"${filename}" isn't a supported file type. Hermit reads PDF, DOCX, CSV/TSV, and TXT files.`,
    );
  }
  return type;
}

export function validateFile(file: File): FileType {
  const type = detectFileType(file.name);
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(
      `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB, which is over Hermit's 25MB per-file limit.`,
    );
  }
  return type;
}

export async function parseFile(file: File, fileType: FileType): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return parsePdf(file);
    case 'docx':
      return parseDocx(file);
    case 'csv':
      return parseCsv(file);
    case 'txt':
      return parseTxt(file);
  }
}
