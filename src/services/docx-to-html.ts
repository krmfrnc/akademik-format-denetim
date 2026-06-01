import type { ParsedDocx, DocxParagraph, DocxRun } from "@/services/docx-analyzer/types";
import { classifyParagraphSection } from "@/services/docx-analyzer/docx-parser";

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
  let inner = text;
  if (run.bold) inner = `<strong>${inner}</strong>`;
  if (run.italic) inner = `<em>${inner}</em>`;
  if (run.underline) inner = `<u>${inner}</u>`;
  return `${spanTag}${inner}</span>`;
}

const ALIGNMENT_MAP: Record<string, string> = {
  left: "left", right: "right", center: "center", both: "justify", justify: "justify",
};

function paragraphToHtml(para: DocxParagraph): string {
  const section = classifyParagraphSection(para);
  const styles: string[] = [];
  if (para.alignment) styles.push(`text-align:${ALIGNMENT_MAP[para.alignment] || para.alignment}`);
  if (para.lineSpacing) styles.push(`line-height:${para.lineSpacing}`);
  if (para.firstLineIndent) styles.push(`text-indent:${para.firstLineIndent / 20}pt`);
  const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
  const runsHtml = para.runs.length > 0 ? para.runs.map(runToHtml).join("") : escapeHtml(para.text);
  if (!runsHtml.trim()) return `<p data-para-index="${para.index}" data-section="${section}"${styleAttr}><br></p>`;
  return `<p data-para-index="${para.index}" data-section="${section}"${styleAttr}>${runsHtml}</p>`;
}

export function parsedDocxToHtml(parsed: ParsedDocx): string {
  return parsed.paragraphs.map(paragraphToHtml).join("\n");
}
