/**
 * oos-pdf.ts — Run 8
 * Generates a printable Order of Service PDF with pdf-lib.
 * Pure JS, no native deps — runs fine on Vercel serverless.
 */
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';

export type OoSItem = {
  type: 'section' | 'item';
  time?: string;
  title: string;
  person?: string;
  durationMin?: number;
  notes?: string;
};

export interface OoSPdfParams {
  churchName: string;
  dateStr: string;          // "Sunday, July 26, 2026"
  topic: string;            // "Title (Scripture)"
  monthTheme?: string | null;
  roles: { label: string; name: string }[]; // resolved lineup
  items: OoSItem[];
}

// ── WinAnsi sanitizer ────────────────────────────────────────────────────────
// Standard PDF fonts only encode WinAnsi (Latin-1-ish). Replace common unicode
// punctuation and strip anything else (emoji, etc.) so drawText never throws.
function sanitize(s: string): string {
  return (s || '')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013]/g, '-')
    .replace(/[\u2014]/g, '--')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[\u2022]/g, '*')
    // strip anything not printable ASCII or common Latin-1
    .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      // Hard-break a single overlong word
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        line = chunk;
      } else {
        line = word;
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// ── Layout constants (US Letter portrait) ───────────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 46;
const CONTENT_W = PAGE_W - MARGIN * 2;

const NAVY   = rgb(0.06, 0.13, 0.26);
const BEIGE  = rgb(0.953, 0.937, 0.906);
const GRAY   = rgb(0.42, 0.47, 0.55);
const DGRAY  = rgb(0.22, 0.26, 0.32);
const LINE   = rgb(0.88, 0.88, 0.88);
const BRAND  = rgb(0.72, 0.45, 0.11);

// Column x-positions
const COL_TIME_X   = MARGIN;
const COL_ITEM_X   = MARGIN + 58;
const COL_ITEM_W   = 238;
const COL_WHO_X    = MARGIN + 304;
const COL_WHO_W    = 148;
const COL_MIN_R    = PAGE_W - MARGIN; // right edge for right-aligned duration

export async function buildOrderOfServicePdf(p: OoSPdfParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const helv       = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  doc.setTitle(`Order of Service — ${sanitize(p.dateStr)}`);
  doc.setAuthor(sanitize(p.churchName));

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let pageNum = 1;
  let y = PAGE_H;

  const footer = (pg: PDFPage, num: number) => {
    const txt = `${sanitize(p.churchName)} — Order of Service — ${sanitize(p.dateStr)}`;
    pg.drawText(txt, { x: MARGIN, y: 24, size: 8, font: helv, color: GRAY });
    const numTxt = `Page ${num}`;
    pg.drawText(numTxt, { x: PAGE_W - MARGIN - helv.widthOfTextAtSize(numTxt, 8), y: 24, size: 8, font: helv, color: GRAY });
  };

  const newPage = () => {
    footer(page, pageNum);
    page = doc.addPage([PAGE_W, PAGE_H]);
    pageNum++;
    y = PAGE_H - MARGIN;
  };

  const ensure = (needed: number) => {
    if (y - needed < 48) newPage();
  };

  // ── Header band ──
  page.drawRectangle({ x: 0, y: PAGE_H - 86, width: PAGE_W, height: 86, color: NAVY });
  page.drawText(sanitize(p.churchName), {
    x: MARGIN, y: PAGE_H - 40, size: 20, font: helvBold, color: rgb(1, 1, 1),
  });
  page.drawText('ORDER OF SERVICE', {
    x: MARGIN, y: PAGE_H - 62, size: 10, font: helv, color: rgb(0.8, 0.84, 0.92),
  });
  y = PAGE_H - 86 - 26;

  // ── Date / Topic / Theme ──
  page.drawText(sanitize(p.dateStr), { x: MARGIN, y, size: 13, font: helvBold, color: DGRAY });
  y -= 18;

  for (const line of wrap(p.topic, helvItalic, 11, CONTENT_W)) {
    ensure(14);
    page.drawText(line, { x: MARGIN, y, size: 11, font: helvItalic, color: BRAND });
    y -= 14;
  }
  if (p.monthTheme) {
    for (const line of wrap(`Theme: ${p.monthTheme}`, helv, 9.5, CONTENT_W)) {
      ensure(12);
      page.drawText(line, { x: MARGIN, y, size: 9.5, font: helv, color: GRAY });
      y -= 12;
    }
  }
  y -= 6;

  // ── Roles lineup box ──
  const roles = p.roles.filter(r => r.name && r.name !== 'TBD');
  if (roles.length) {
    const rowsNeeded = Math.ceil(roles.length / 2);
    const boxH = rowsNeeded * 15 + 16;
    ensure(boxH + 10);
    page.drawRectangle({ x: MARGIN, y: y - boxH, width: CONTENT_W, height: boxH, color: BEIGE });
    let ry = y - 14;
    for (let i = 0; i < roles.length; i += 2) {
      const left = roles[i];
      const right = roles[i + 1];
      page.drawText(sanitize(`${left.label}:`), { x: MARGIN + 10, y: ry, size: 9, font: helvBold, color: DGRAY });
      page.drawText(sanitize(left.name), { x: MARGIN + 10 + helvBold.widthOfTextAtSize(sanitize(`${left.label}:`), 9) + 5, y: ry, size: 9, font: helv, color: DGRAY });
      if (right) {
        const rx = MARGIN + CONTENT_W / 2 + 6;
        page.drawText(sanitize(`${right.label}:`), { x: rx, y: ry, size: 9, font: helvBold, color: DGRAY });
        page.drawText(sanitize(right.name), { x: rx + helvBold.widthOfTextAtSize(sanitize(`${right.label}:`), 9) + 5, y: ry, size: 9, font: helv, color: DGRAY });
      }
      ry -= 15;
    }
    y -= boxH + 14;
  } else {
    y -= 4;
  }

  // ── Table header ──
  const drawTableHeader = () => {
    ensure(20);
    page.drawText('TIME', { x: COL_TIME_X, y, size: 8, font: helvBold, color: GRAY });
    page.drawText('ITEM', { x: COL_ITEM_X, y, size: 8, font: helvBold, color: GRAY });
    page.drawText('WHO',  { x: COL_WHO_X,  y, size: 8, font: helvBold, color: GRAY });
    const minH = 'MIN';
    page.drawText(minH, { x: COL_MIN_R - helvBold.widthOfTextAtSize(minH, 8), y, size: 8, font: helvBold, color: GRAY });
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.8, color: DGRAY });
    y -= 12;
  };
  drawTableHeader();

  // ── Rows ──
  for (const it of p.items) {
    if (it.type === 'section') {
      ensure(24);
      page.drawRectangle({ x: MARGIN, y: y - 5, width: CONTENT_W, height: 17, color: BEIGE });
      page.drawText(sanitize(it.title).toUpperCase(), { x: MARGIN + 8, y, size: 9.5, font: helvBold, color: DGRAY });
      y -= 22;
      continue;
    }

    const titleLines  = wrap(it.title, helv, 9.5, COL_ITEM_W);
    const personLines = it.person ? wrap(it.person, helv, 9.5, COL_WHO_W) : [''];
    const bodyLines   = Math.max(titleLines.length, personLines.length);
    const notesLines  = it.notes ? wrap(it.notes, helvItalic, 8.5, CONTENT_W - 58) : [];
    const rowH = bodyLines * 12 + notesLines.length * 11 + 8;
    ensure(rowH);

    if (it.time) page.drawText(sanitize(it.time), { x: COL_TIME_X, y, size: 9.5, font: helvBold, color: DGRAY });
    titleLines.forEach((line, i) => {
      page.drawText(line, { x: COL_ITEM_X, y: y - i * 12, size: 9.5, font: helv, color: DGRAY });
    });
    personLines.forEach((line, i) => {
      if (line) page.drawText(line, { x: COL_WHO_X, y: y - i * 12, size: 9.5, font: helv, color: DGRAY });
    });
    if (it.durationMin) {
      const d = `${it.durationMin} min`;
      page.drawText(d, { x: COL_MIN_R - helv.widthOfTextAtSize(d, 9.5), y, size: 9.5, font: helv, color: GRAY });
    }
    y -= bodyLines * 12;

    for (const line of notesLines) {
      page.drawText(line, { x: COL_ITEM_X, y, size: 8.5, font: helvItalic, color: GRAY });
      y -= 11;
    }

    y -= 4;
    page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE_W - MARGIN, y: y + 2 }, thickness: 0.4, color: LINE });
    y -= 8;
  }

  footer(page, pageNum);
  return doc.save();
}

export function oosPdfFilename(date: Date): string {
  const iso = date.toISOString().slice(0, 10);
  return `order-of-service-${iso}.pdf`;
}
