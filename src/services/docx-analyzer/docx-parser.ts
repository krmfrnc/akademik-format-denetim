import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type {
  ParsedDocx,
  DocxParagraph,
  DocxRun,
  DocxSection,
  DocxTable,
  SectionRules,
} from "./types";

interface StyleDefinition {
  styleId: string;
  name: string;
  basedOn: string | null;
  rPr: {
    fontFamily: string | null;
    fontSize: number | null;
    bold: boolean | null;
    italic: boolean | null;
  };
  pPr: {
    alignment: string | null;
    lineSpacing: number | null;
    spacingBefore: number | null;
    spacingAfter: number | null;
    firstLineIndent: number | null;
  };
}

const TWIPS_PER_PT = 20;
const TWIPS_PER_CM = 567;
const LINE_SPACING_SINGLE = 240;

function createXmlParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    isArray: (_name: string, jpath: string) => {
      const arrayPaths = [
        "document.body.p",
        "document.body.tbl",
        "document.body.sectPr",
        "p.r",
        "r.t",
        "tbl.tr",
        "tr.tc",
        "tc.p",
        "styles.style",
        "style.pPr",
        "style.rPr",
      ];
      return arrayPaths.includes(jpath);
    },
    numberParseOptions: {
      leadingZeros: false,
      hex: false,
      skipLike: /\+/,
    },
  });
}

function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  try {
    const keys = path.split(".");
    let current: unknown = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return fallback;
      if (Array.isArray(current)) {
        const arr = current as Record<string, unknown>[];
        const merged: Record<string, unknown> = {};
        for (const item of arr) {
          current = item[key];
        }
      } else {
        current = (current as Record<string, unknown>)[key];
      }
    }
    return (current as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === undefined || value === null) return [];
  return [value as T];
}

export async function parseDocxBuffer(
  buffer: ArrayBuffer,
): Promise<ParsedDocx> {
  const zip = await JSZip.loadAsync(buffer);

  const documentXmlStr = await zip.file("word/document.xml")?.async("string");
  if (!documentXmlStr) {
    throw new Error("word/document.xml bulunamadı. Geçersiz .docx dosyası.");
  }

  const stylesXmlStr = await zip.file("word/styles.xml")?.async("string");

  const parser = createXmlParser();
  const parsedDocument = parser.parse(documentXmlStr);
  const parsedStyles = stylesXmlStr ? parser.parse(stylesXmlStr) : null;

  const styles = parseStyles(parsedStyles);

  const paragraphs = parseParagraphs(parsedDocument, styles);
  const sections = parseSections(parsedDocument);
  const tables = parseTables(parsedDocument);
  const rawText = paragraphs.map((p) => p.text).join("\n");

  let wordCount = 0;
  for (const para of paragraphs) {
    const words = para.text.trim().split(/\s+/).filter(Boolean);
    wordCount += words.length;
  }

  const citationCount = countInTextCitations(rawText);

  let pageCount = 1;
  try {
    const appXmlStr = await zip.file("docProps/app.xml")?.async("string");
    if (appXmlStr) {
      const appXml = parser.parse(appXmlStr);
      const pages = safeGet<number>(appXml, "Properties.Pages", 0);
      if (pages > 0) pageCount = pages;
    }
  } catch {
    pageCount = Math.max(1, Math.ceil(wordCount / 300));
  }

  return {
    paragraphs,
    sections,
    tables,
    rawText,
    pageCount,
    wordCount,
    citationCount,
  };
}

function parseStyles(parsedStyles: unknown): Map<string, StyleDefinition> {
  const styleMap = new Map<string, StyleDefinition>();

  if (!parsedStyles) return styleMap;

  try {
    const styleEntries = ensureArray<Record<string, unknown>>(
      (parsedStyles as Record<string, unknown>)?.styles?.style,
    );

    for (const style of styleEntries) {
      const styleId = safeGet<string>(style, "@_styleId", "");
      if (!styleId) continue;

      const name = safeGet<string>((style as Record<string, unknown>)?.name, "@_val", "");

      const rPr = (style as Record<string, unknown>)?.rPr as Record<string, unknown> | undefined;
      const pPr = (style as Record<string, unknown>)?.pPr as Record<string, unknown> | undefined;
      const basedOn = safeGet<string>(pPr ?? {}, "basedOn.@_val", null);

      styleMap.set(styleId, {
        styleId,
        name: name?.toLowerCase() ?? "",
        basedOn,
        rPr: {
          fontFamily: safeGet<string>(rPr ?? {}, "rFonts.@_ascii", null),
          fontSize: safeGetNumberToPoints(rPr ?? {}, "sz.@_val"),
          bold: rPr?.bold !== undefined ? true : null,
          italic: rPr?.italic !== undefined ? true : null,
        },
        pPr: {
          alignment: safeGet<string>(pPr ?? {}, "jc.@_val", null),
          lineSpacing: safeGetNumberToLineSpacing(pPr ?? {}, "spacing.@_line"),
          spacingBefore: safeGet<number>(pPr ?? {}, "spacing.@_before", 0),
          spacingAfter: safeGet<number>(pPr ?? {}, "spacing.@_after", 0),
          firstLineIndent: safeGet<number | null>(pPr ?? {}, "ind.@_firstLine", null),
        },
      });
    }
  } catch {
    // Stil parse hatası kritik değil
  }

  return styleMap;
}

function parseParagraphs(
  parsedDocument: unknown,
  styles: Map<string, StyleDefinition>,
): DocxParagraph[] {
  const body = (parsedDocument as Record<string, unknown>)?.document?.body as Record<string, unknown>;
  if (!body) return [];

  const pElements = ensureArray<Record<string, unknown>>(body.p);
  const paragraphs: DocxParagraph[] = [];

  for (let i = 0; i < pElements.length; i++) {
    const pEl = pElements[i];

    try {
      const pPr = (pEl.pPr ?? {}) as Record<string, unknown>;
      const styleId = safeGet<string | null>(pPr, "pStyle.@_val", null);

      const styleDef = styleId ? styles.get(styleId) : undefined;
      const resolvedStyle = resolveStyle(styleDef, styles);

      const runs = parseRuns(pEl);
      const text = runs.map((r) => r.text).join("");

      const alignment =
        safeGet<string | null>(pPr, "jc.@_val", null) ??
        resolvedStyle?.pPr?.alignment ??
        null;

      const lineSpacingRaw = safeGet<number | null>(
        pPr,
        "spacing.@_line",
        null,
      );
      const lineSpacing =
        lineSpacingRaw !== null
          ? lineSpacingToRatio(lineSpacingRaw)
          : resolvedStyle?.pPr?.lineSpacing ?? null;

      const spacingBefore =
        safeGet<number | null>(pPr, "spacing.@_before", null) ??
        resolvedStyle?.pPr?.spacingBefore ??
        null;

      const spacingAfter =
        safeGet<number | null>(pPr, "spacing.@_after", null) ??
        resolvedStyle?.pPr?.spacingAfter ??
        null;

      const firstLineIndent =
        safeGet<number | null>(pPr, "ind.@_firstLine", null) ??
        resolvedStyle?.pPr?.firstLineIndent ??
        null;

      const leftIndent = safeGet<number | null>(pPr, "ind.@_left", null);
      const rightIndent = safeGet<number | null>(pPr, "ind.@_right", null);

      paragraphs.push({
        index: i,
        styleId,
        styleName: styleDef?.name ?? null,
        text,
        alignment,
        lineSpacing,
        spacingBefore,
        spacingAfter,
        firstLineIndent,
        leftIndent,
        rightIndent,
        runs,
      });
    } catch {
      paragraphs.push({
        index: i,
        styleId: null,
        styleName: null,
        text: "",
        alignment: null,
        lineSpacing: null,
        spacingBefore: null,
        spacingAfter: null,
        firstLineIndent: null,
        leftIndent: null,
        rightIndent: null,
        runs: [],
      });
    }
  }

  return paragraphs;
}

function parseRuns(pEl: Record<string, unknown>): DocxRun[] {
  const rElements = ensureArray<Record<string, unknown>>(pEl.r);
  const runs: DocxRun[] = [];

  for (const rEl of rElements) {
    try {
      const rPr = (rEl.rPr ?? {}) as Record<string, unknown>;
      const tElements = ensureArray<Record<string, unknown>>(rEl.t);

      let text = "";
      for (const tEl of tElements) {
        const preserveSpace = tEl["@_xml:space"] === "preserve";
        text += preserveSpace
          ? String(tEl["#text"] ?? "")
          : String(tEl["#text"] ?? "").trimStart();
      }

      runs.push({
        text,
        fontFamily: safeGet<string | null>(rPr, "rFonts.@_ascii", null),
        fontSize: safeGetNumberToPoints(rPr, "sz.@_val"),
        bold: rPr.bold !== undefined,
        italic: rPr.italic !== undefined,
        underline: rPr.u !== undefined,
      });
    } catch {
      runs.push({
        text: "",
        fontFamily: null,
        fontSize: null,
        bold: false,
        italic: false,
        underline: false,
      });
    }
  }

  return runs;
}

function parseSections(parsedDocument: unknown): DocxSection[] {
  const body = (parsedDocument as Record<string, unknown>)?.document?.body as Record<string, unknown>;
  if (!body) return [];

  const sectPrElements = ensureArray<Record<string, unknown>>(body.sectPr);
  const sections: DocxSection[] = [];

  for (const sectPr of sectPrElements) {
    try {
      const pgSz = (sectPr.pgSz ?? {}) as Record<string, unknown>;
      const pgMar = (sectPr.pgMar ?? {}) as Record<string, unknown>;
      const pgNumType = (sectPr.pgNumType ?? {}) as Record<string, unknown>;

      sections.push({
        pageWidth: safeGet<number | null>(pgSz, "@_w", null),
        pageHeight: safeGet<number | null>(pgSz, "@_h", null),
        marginTop: safeGet<number | null>(pgMar, "@_top", null),
        marginBottom: safeGet<number | null>(pgMar, "@_bottom", null),
        marginLeft: safeGet<number | null>(pgMar, "@_left", null),
        marginRight: safeGet<number | null>(pgMar, "@_right", null),
        pageNumberFormat: safeGet<string | null>(pgNumType, "@_fmt", null),
        pageNumberStart: safeGet<number | null>(pgNumType, "@_start", null),
      });
    } catch {
      sections.push({
        pageWidth: null,
        pageHeight: null,
        marginTop: null,
        marginBottom: null,
        marginLeft: null,
        marginRight: null,
        pageNumberFormat: null,
        pageNumberStart: null,
      });
    }
  }

  return sections;
}

function parseTables(parsedDocument: unknown): DocxTable[] {
  const body = (parsedDocument as Record<string, unknown>)?.document?.body as Record<string, unknown>;
  if (!body) return [];

  const tblElements = ensureArray<Record<string, unknown>>(body.tbl);
  const tables: DocxTable[] = [];

  for (let i = 0; i < tblElements.length; i++) {
    const tbl = tblElements[i];
    try {
      const tblPr = (tbl.tblPr ?? {}) as Record<string, unknown>;
      const tblBorders = (tblPr.tblBorders ?? {}) as Record<string, unknown>;

      const insideH = tblBorders.insideH as Record<string, unknown> | undefined;
      const insideV = tblBorders.insideV as Record<string, unknown> | undefined;

      const insideHVal = safeGet<string | null>(insideH ?? {}, "@_val", null);
      const insideVVal = safeGet<string | null>(insideV ?? {}, "@_val", null);

      const hasInsideH = insideH !== undefined && insideHVal !== "none";
      const hasInsideV = insideV !== undefined && insideVVal !== "none";

      const trElements = ensureArray<Record<string, unknown>>(tbl.tr);
      const rowCount = trElements.length;
      const colCount = trElements.length > 0
        ? ensureArray<Record<string, unknown>>(trElements[0].tc).length
        : 0;

      tables.push({
        index: i,
        insideHorizontalBorder: hasInsideH,
        insideVerticalBorder: hasInsideV,
        rowCount,
        colCount,
      });
    } catch {
      tables.push({
        index: i,
        insideHorizontalBorder: false,
        insideVerticalBorder: false,
        rowCount: 0,
        colCount: 0,
      });
    }
  }

  return tables;
}

function resolveStyle(
  style: StyleDefinition | undefined,
  styles: Map<string, StyleDefinition>,
): StyleDefinition | undefined {
  if (!style) return undefined;
  if (!style.basedOn) return style;

  const parent = styles.get(style.basedOn);
  if (!parent) return style;

  return {
    styleId: style.styleId,
    name: style.name,
    basedOn: parent.basedOn,
    rPr: {
      fontFamily: style.rPr.fontFamily ?? parent.rPr.fontFamily,
      fontSize: style.rPr.fontSize ?? parent.rPr.fontSize,
      bold: style.rPr.bold ?? parent.rPr.bold,
      italic: style.rPr.italic ?? parent.rPr.italic,
    },
    pPr: {
      alignment: style.pPr.alignment ?? parent.pPr.alignment,
      lineSpacing: style.pPr.lineSpacing ?? parent.pPr.lineSpacing,
      spacingBefore: style.pPr.spacingBefore ?? parent.pPr.spacingBefore,
      spacingAfter: style.pPr.spacingAfter ?? parent.pPr.spacingAfter,
      firstLineIndent:
        style.pPr.firstLineIndent ?? parent.pPr.firstLineIndent,
    },
  };
}

function safeGetNumberToPoints(
  obj: Record<string, unknown>,
  path: string,
): number | null {
  const val = safeGet<number | null>(obj, path, null);
  if (val === null) return null;
  return val / 2; // half-points → points
}

function safeGetNumberToLineSpacing(
  obj: Record<string, unknown>,
  path: string,
): number | null {
  const val = safeGet<number | null>(obj, path, null);
  if (val === null) return null;
  return lineSpacingToRatio(val);
}

function lineSpacingToRatio(raw: number): number {
  return Math.round((raw / LINE_SPACING_SINGLE) * 100) / 100;
}

function countInTextCitations(text: string): number {
  const patterns = [
    /\([^)]*\d{4}[^)]*\)/g,
    /[A-ZŞĞÜÇİÖ][a-zşğüçıö]+\s+vd\.\s*,\s*\d{4}/g,
    /[A-ZŞĞÜÇİÖ][a-zşğüçıö]+\s+ve\s+[A-ZŞĞÜÇİÖ][a-zşğüçıö]+\s*,\s*\d{4}/g,
    /et\s+al\.\s*,\s*\d{4}/gi,
    /\b(?:Aksal|Akçıl|Büyüköztürk|Karasar|Yıldırım)\b/g,
  ];

  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

export function classifyParagraphSection(
  para: DocxParagraph,
  defaultSection: string = "body",
): string {
  const styleName = para.styleName?.toLowerCase() ?? "";

  if (!styleName) return defaultSection;

  if (
    styleName.includes("heading") ||
    styleName.includes("başlık") ||
    styleName.includes("heading 1") ||
    styleName.includes("başlık 1")
  ) {
    return styleName.includes("1") ? "heading1" : "heading2";
  }
  if (
    styleName.includes("heading 2") ||
    styleName.includes("başlık 2")
  ) {
    return "heading2";
  }
  if (
    styleName.includes("heading 3") ||
    styleName.includes("başlık 3")
  ) {
    return "heading3";
  }
  if (styleName.includes("abstract") || styleName.includes("öz")) {
    return "abstract";
  }
  if (styleName.includes("footnote") || styleName.includes("dipnot")) {
    return "footnote";
  }
  if (
    styleName.includes("bibliography") ||
    styleName.includes("kaynakça") ||
    styleName.includes("references")
  ) {
    return "bibliography";
  }

  return defaultSection;
}

export function twipsToCm(twips: number): number {
  return Math.round((twips / TWIPS_PER_CM) * 100) / 100;
}

export function cmToTwips(cm: number): number {
  return Math.round(cm * TWIPS_PER_CM);
}

export function parseCmValue(value: string): number | null {
  const match = value.toLowerCase().trim().match(/^([\d.]+)\s*cm$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}
