import type {
  ParsedDocx,
  DocxParagraph,
  DocxRun,
  DocxTable,
} from "@/services/docx-analyzer/types";
import { classifyParagraphSection } from "@/services/docx-analyzer/docx-parser";

export interface DocxHtmlResult {
  html: string;
}

const ALIGNMENT_MAP: Record<string, string> = {
  left: "left",
  right: "right",
  center: "center",
  both: "justify",
  justify: "justify",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runToHtml(run: DocxRun): string {
  const styles: string[] = [];
  if (run.fontFamily) styles.push(`font-family:${run.fontFamily}`);
  if (run.fontSize) styles.push(`font-size:${run.fontSize}pt`);

  const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
  const text = escapeHtml(run.text);

  if (!text.trim()) return text;

  const spanTag = styleAttr ? `<span${styleAttr}>` : "<span>";
  const closeTag = "</span>";

  let inner = text;
  if (run.bold) inner = `<strong>${inner}</strong>`;
  if (run.italic) inner = `<em>${inner}</em>`;
  if (run.underline) inner = `<u>${inner}</u>`;

  return `${spanTag}${inner}${closeTag}`;
}

function paragraphToHtml(para: DocxParagraph): string {
  const section = classifyParagraphSection(para);
  const styles: string[] = [];

  if (para.alignment) {
    const cssAlign = ALIGNMENT_MAP[para.alignment] || para.alignment;
    styles.push(`text-align:${cssAlign}`);
  }
  if (para.lineSpacing) {
    styles.push(`line-height:${para.lineSpacing}`);
  }
  if (para.firstLineIndent) {
    styles.push(`text-indent:${para.firstLineIndent / 20}pt`);
  }

  const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";

  const runsHtml = para.runs.length > 0
    ? para.runs.map(runToHtml).join("")
    : escapeHtml(para.text);

  if (!runsHtml.trim()) return `<p data-para-index="${para.index}" data-section="${section}"${styleAttr}><br></p>`;

  return `<p data-para-index="${para.index}" data-section="${section}"${styleAttr}>${runsHtml}</p>`;
}

function tableToHtml(table: DocxTable, tableParagraphs: DocxParagraph[]): string {
  const borderStyle = table.insideHorizontalBorder || table.insideVerticalBorder
    ? ' style="border-collapse:collapse"'
    : ' style="border-collapse:collapse"';

  let html = `<table${borderStyle} class="docx-table" data-table-index="${table.index}">`;

  const rows = Math.min(table.rowCount, 100);
  for (let r = 0; r < rows; r++) {
    html += "<tr>";
    for (let c = 0; c < table.colCount; c++) {
      const cellIndex = r * table.colCount + c;
      const para = tableParagraphs[cellIndex];
      const cellContent = para ? paragraphToHtml(para).replace(/<\/?p[^>]*>/g, "") : "";
      html += `<td style="border:1px solid #ccc;padding:4px 8px;vertical-align:top">${cellContent}</td>`;
    }
    html += "</tr>";
  }
  html += "</table>";
  return html;
}

export function parsedDocxToHtml(parsed: ParsedDocx): DocxHtmlResult {
  const parts: string[] = [];

  let tableIdx = 0;
  // We don't have a perfect paragraph-to-table mapping from the parsed data,
  // so we track tables separately. The paragraphs array contains ALL paragraphs
  // including those inside tables. For now, we render all paragraphs linearly
  // and insert table HTML at the approximate position.
  const tableParagraphRanges: { start: number; end: number; table: DocxTable | null }[] = [];

  // Simple heuristic: treat consecutive paragraphs as table cells if they appear reasonable
  // Just render all paragraphs for now — tables will be rendered as regular text in cells
  for (const para of parsed.paragraphs) {
    parts.push(paragraphToHtml(para));
  }

  const html = parts.join("\n");

  return { html };
}
