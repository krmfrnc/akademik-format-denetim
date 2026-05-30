import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import type { FormatRules, SectionRules } from "./types";
import { parseCmValue, cmToTwips } from "./docx-parser";

function createParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: false,
    isArray: (name: string) => {
      const n = stripPrefix(name);
      return ["p", "r", "t", "tbl", "tr", "tc", "sectPr", "style", "br"].includes(n);
    },
    numberParseOptions: {
      leadingZeros: false,
      hex: false,
      skipLike: /^\+/,
    },
  });
}

function createBuilder(): XMLBuilder {
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    suppressBooleanAttributes: false,
    suppressEmptyNode: false,
  });
}

function stripPrefix(tagName: string): string {
  const idx = tagName.lastIndexOf(":");
  return idx > -1 ? tagName.substring(idx + 1) : tagName;
}

function getTag(name: string): string {
  return name.includes(":") ? name : `w:${name}`;
}

function classifyParagraphByStyle(pEl: Record<string, unknown>): string {
  try {
    const pPr = (pEl[getTag("pPr")] ?? {}) as Record<string, unknown>;
    const pStyle = (pPr[getTag("pStyle")] ?? {}) as Record<string, unknown>;
    const styleId = (pStyle["@_w:val"] as string) ?? "";
    const lower = styleId.toLowerCase();

    if (lower.includes("heading1") || lower.includes("baslik1")) return "heading1";
    if (lower.includes("heading2") || lower.includes("baslik2")) return "heading2";
    if (lower.includes("heading3") || lower.includes("baslik3")) return "heading3";
    if (lower.includes("abstract") || lower.includes("oz")) return "abstract";
    if (lower.includes("footnote") || lower.includes("dipnot")) return "footnote";
    if (lower.includes("bibliography") || lower.includes("kaynakca")) return "bibliography";

    return "body";
  } catch {
    return "body";
  }
}

export async function fixFormatting(
  docxBuffer: ArrayBuffer,
  rules: FormatRules,
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(docxBuffer);

  const documentXmlFile = zip.file("word/document.xml");
  if (!documentXmlFile) {
    throw new Error("word/document.xml bulunamadı.");
  }

  const documentXmlStr = await documentXmlFile.async("string");
  const parser = createParser();
  const parsed = parser.parse(documentXmlStr);

  const body = (parsed[getTag("document")] as Record<string, unknown>)?.[getTag("body")] as Record<string, unknown>;
  if (!body) {
    throw new Error("Belge gövdesi (w:body) bulunamadı.");
  }

  const paragraphs = ensureArray(body[getTag("p")]);

  for (const pEl of paragraphs) {
    const section = classifyParagraphByStyle(pEl as Record<string, unknown>);
    let sectionRule: SectionRules | undefined;

    switch (section) {
      case "heading1": sectionRule = rules.heading1; break;
      case "heading2": sectionRule = rules.heading2; break;
      case "heading3": sectionRule = rules.heading3; break;
      case "abstract": sectionRule = rules.abstract; break;
      case "footnote": sectionRule = rules.footnote; break;
      case "bibliography": sectionRule = rules.bibliography; break;
      default: sectionRule = rules.body; break;
    }

    if (!sectionRule) continue;

    const para = pEl as Record<string, unknown>;
    applyParagraphFormatting(para, sectionRule, section);
    applyRunFormatting(para, sectionRule);
  }

  const sections = ensureArray(body[getTag("sectPr")]);
  for (const sectPr of sections) {
    applySectionFormatting(sectPr as Record<string, unknown>, rules.body);
  }

  const builder = createBuilder();
  const fixedXmlStr = builder.build(parsed);

  zip.file("word/document.xml", fixedXmlStr);

  const modifiedBuffer = await zip.generateAsync({ type: "arraybuffer" });
  return modifiedBuffer;
}

function applyParagraphFormatting(
  para: Record<string, unknown>,
  rule: SectionRules,
  _section: string,
): void {
  let pPr = para[getTag("pPr")] as Record<string, unknown> | undefined;
  if (!pPr) {
    pPr = {};
    para[getTag("pPr")] = pPr;
  }

  if (rule.lineSpacing !== undefined) {
    const spacingTag = getTag("spacing");
    const spacing = (pPr[spacingTag] ?? {}) as Record<string, unknown>;
    spacing["@_w:line"] = Math.round(rule.lineSpacing * 240);
    spacing["@_w:lineRule"] = "auto";
    pPr[spacingTag] = spacing;
  }

  if (rule.paragraphSpacing !== undefined) {
    const spacingTag = getTag("spacing");
    const spacing = (pPr[spacingTag] ?? {}) as Record<string, unknown>;
    spacing["@_w:before"] = Math.round(rule.paragraphSpacing * 20);
    spacing["@_w:after"] = Math.round(rule.paragraphSpacing * 20);
    pPr[spacingTag] = spacing;
  }

  if (rule.alignment) {
    const jcTag = getTag("jc");
    const jc = (pPr[jcTag] ?? {}) as Record<string, unknown>;
    let val = rule.alignment.toLowerCase();
    if (val === "justify") val = "both";
    if (val === "justified") val = "both";
    jc["@_w:val"] = val;
    pPr[jcTag] = jc;
  }

  if (rule.firstLineIndent) {
    const indentCm = parseCmValue(rule.firstLineIndent);
    if (indentCm !== null) {
      const indentTag = getTag("ind");
      const ind = (pPr[indentTag] ?? {}) as Record<string, unknown>;
      ind["@_w:firstLine"] = cmToTwips(indentCm);
      pPr[indentTag] = ind;
    }
  }
}

function applyRunFormatting(
  para: Record<string, unknown>,
  rule: SectionRules,
): void {
  const runs = ensureArray(para[getTag("r")]);

  for (const r of runs) {
    const run = r as Record<string, unknown>;
    let rPr = run[getTag("rPr")] as Record<string, unknown> | undefined;
    if (!rPr) {
      rPr = {};
      run[getTag("rPr")] = rPr;
    }

    if (rule.fontFamily) {
      const rFontsTag = getTag("rFonts");
      const rFonts = (rPr[rFontsTag] ?? {}) as Record<string, unknown>;
      rFonts["@_w:ascii"] = rule.fontFamily;
      rFonts["@_w:hAnsi"] = rule.fontFamily;
      rFonts["@_w:cs"] = rule.fontFamily;
      rPr[rFontsTag] = rFonts;
    }

    if (rule.fontSize !== undefined) {
      const halfPoints = Math.round(rule.fontSize * 2);
      const szTag = getTag("sz");
      const szCsTag = getTag("szCs");
      rPr[szTag] = { "@_w:val": halfPoints };
      rPr[szCsTag] = { "@_w:val": halfPoints };
    }

    if (rule.bold !== undefined) {
      const bTag = getTag("b");
      if (rule.bold) {
        const b = (rPr[bTag] ?? {}) as Record<string, unknown>;
        delete b["@_w:val"];
        rPr[bTag] = b;
      } else {
        rPr[bTag] = { "@_w:val": "false" };
      }
    }

    if (rule.italic !== undefined) {
      const iTag = getTag("i");
      if (rule.italic) {
        const i = (rPr[iTag] ?? {}) as Record<string, unknown>;
        delete i["@_w:val"];
        rPr[iTag] = i;
      } else {
        rPr[iTag] = { "@_w:val": "false" };
      }
    }
  }
}

function applySectionFormatting(
  sectPr: Record<string, unknown>,
  rule: SectionRules | undefined,
): void {
  if (!rule) return;

  const pgMarTag = getTag("pgMar");
  let pgMar = sectPr[pgMarTag] as Record<string, unknown> | undefined;
  if (!pgMar) {
    pgMar = {};
    sectPr[pgMarTag] = pgMar;
  }

  if (rule.marginTop) {
    const cm = parseCmValue(rule.marginTop);
    if (cm !== null) pgMar["@_w:top"] = cmToTwips(cm);
  }
  if (rule.marginBottom) {
    const cm = parseCmValue(rule.marginBottom);
    if (cm !== null) pgMar["@_w:bottom"] = cmToTwips(cm);
  }
  if (rule.marginLeft) {
    const cm = parseCmValue(rule.marginLeft);
    if (cm !== null) pgMar["@_w:left"] = cmToTwips(cm);
  }
  if (rule.marginRight) {
    const cm = parseCmValue(rule.marginRight);
    if (cm !== null) pgMar["@_w:right"] = cmToTwips(cm);
  }
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === undefined || value === null) return [];
  return [value as T];
}
