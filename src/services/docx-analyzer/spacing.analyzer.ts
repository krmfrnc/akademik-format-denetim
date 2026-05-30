import type { DocxParagraph, FormatRules, Violation } from "./types";
import {
  classifyParagraphSection,
  twipsToCm,
  cmToTwips,
  parseCmValue,
} from "./docx-parser";

export function analyzeSpacing(
  paragraphs: DocxParagraph[],
  rules: FormatRules,
): Violation[] {
  const violations: Violation[] = [];

  const sectionRules = extractSectionRules(rules);

  for (const para of paragraphs) {
    if (para.text.trim().length === 0) continue;

    const section = classifyParagraphSection(para);
    const rule = sectionRules[section];

    if (!rule) continue;

    checkLineSpacing(para, rule, section, violations);
    checkParagraphSpacing(para, rule, section, violations);
    checkAlignment(para, rule, section, violations);
    checkFirstLineIndent(para, rule, section, violations);
  }

  return violations;
}

function extractSectionRules(rules: FormatRules): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  const sectionKeys: (keyof FormatRules)[] = [
    "body",
    "heading1",
    "heading2",
    "heading3",
    "abstract",
    "footnote",
    "bibliography",
  ];

  for (const key of sectionKeys) {
    const section = rules[key];
    if (section && typeof section === "object") {
      result[key] = section as Record<string, unknown>;
    }
  }

  return result;
}

function checkLineSpacing(
  para: DocxParagraph,
  rule: Record<string, unknown>,
  section: string,
  violations: Violation[],
): void {
  const expected = rule.lineSpacing as number | undefined;
  if (!expected) return;

  const found =
    para.lineSpacing !== null
      ? formatLineSpacing(para.lineSpacing)
      : "belirtilmemiş";

  if (para.lineSpacing === null) {
    violations.push({
      type: "LINE_SPACING",
      severity: "WARNING",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde satır aralığı belirtilmemiş. Word varsayılanı kullanılıyor olabilir.`,
      expected: formatLineSpacing(expected),
      found,
      suggestion: `Satır aralığını ${formatLineSpacing(expected)} olarak ayarlayın.`,
    });
    return;
  }

  if (Math.abs(para.lineSpacing - expected) > 0.05) {
    violations.push({
      type: "LINE_SPACING",
      severity: "ERROR",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde satır aralığı kurala uymuyor.`,
      expected: formatLineSpacing(expected),
      found,
      suggestion: `Satır aralığını ${formatLineSpacing(expected)} olarak değiştirin.`,
    });
  }
}

function checkParagraphSpacing(
  para: DocxParagraph,
  rule: Record<string, unknown>,
  section: string,
  violations: Violation[],
): void {
  const expectedBefore = rule.paragraphSpacing as number | undefined;
  const expectedAfter = rule.paragraphSpacing as number | undefined;

  if (expectedBefore !== undefined && para.spacingBefore !== null) {
    const beforePt = para.spacingBefore / 20;
    if (Math.abs(beforePt - expectedBefore) > 0.5) {
      violations.push({
        type: "PARAGRAPH_SPACING",
        severity: "WARNING",
        section,
        location: `Paragraf ${para.index + 1}`,
        description: `${section} bölümünde paragraf öncesi boşluk kurala uymuyor.`,
        expected: `${expectedBefore} punto`,
        found: `${beforePt} punto`,
        suggestion: `Paragraf öncesi boşluğu ${expectedBefore} punto olarak ayarlayın.`,
      });
    }
  }

  if (expectedAfter !== undefined && para.spacingAfter !== null) {
    const afterPt = para.spacingAfter / 20;
    if (Math.abs(afterPt - expectedAfter) > 0.5) {
      violations.push({
        type: "PARAGRAPH_SPACING",
        severity: "WARNING",
        section,
        location: `Paragraf ${para.index + 1}`,
        description: `${section} bölümünde paragraf sonrası boşluk kurala uymuyor.`,
        expected: `${expectedAfter} punto`,
        found: `${afterPt} punto`,
        suggestion: `Paragraf sonrası boşluğu ${expectedAfter} punto olarak ayarlayın.`,
      });
    }
  }
}

function checkAlignment(
  para: DocxParagraph,
  rule: Record<string, unknown>,
  section: string,
  violations: Violation[],
): void {
  const expectedAlignment = rule.alignment as string | undefined;
  if (!expectedAlignment) return;

  const normalizedExpected = normalizeAlignment(expectedAlignment);
  const foundAlignment = para.alignment ?? "belirtilmemiş";
  const normalizedFound = normalizeAlignment(foundAlignment);

  if (para.alignment === null) {
    violations.push({
      type: "ALIGNMENT",
      severity: "WARNING",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde hizalama belirtilmemiş. Word varsayılanı kullanılıyor.`,
      expected: expectedAlignment,
      found: "belirtilmemiş",
      suggestion: `Hizalamayı "${expectedAlignment}" olarak ayarlayın.`,
    });
    return;
  }

  if (normalizedFound !== normalizedExpected) {
    violations.push({
      type: "ALIGNMENT",
      severity: "ERROR",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde metin hizalaması kurala uymuyor.`,
      expected: expectedAlignment,
      found: foundAlignment,
      suggestion: `Hizalamayı "${expectedAlignment}" olarak değiştirin.`,
    });
  }
}

function checkFirstLineIndent(
  para: DocxParagraph,
  rule: Record<string, unknown>,
  section: string,
  violations: Violation[],
): void {
  const expectedStr = rule.firstLineIndent as string | undefined;
  if (!expectedStr) return;

  const expectedCm = parseCmValue(expectedStr);
  if (expectedCm === null) return;

  const found =
    para.firstLineIndent !== null
      ? `${twipsToCm(para.firstLineIndent).toFixed(2)} cm`
      : "yok";

  if (para.firstLineIndent === null) {
    violations.push({
      type: "FIRST_LINE_INDENT",
      severity: "WARNING",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde ilk satır girintisi belirtilmemiş.`,
      expected: expectedStr,
      found,
      suggestion: `İlk satır girintisini ${expectedStr} olarak ayarlayın.`,
    });
    return;
  }

  const expectedTwips = cmToTwips(expectedCm);
  const tolerance = 30; // yaklaşık 0.5 mm

  if (Math.abs(para.firstLineIndent - expectedTwips) > tolerance) {
    violations.push({
      type: "FIRST_LINE_INDENT",
      severity: "ERROR",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde ilk satır girintisi kurala uymuyor.`,
      expected: expectedStr,
      found,
      suggestion: `İlk satır girintisini ${expectedStr} olarak değiştirin.`,
    });
  }
}

function formatLineSpacing(value: number): string {
  if (value === 1) return "1.0 (tek)";
  if (value === 1.15) return "1.15";
  if (value === 1.5) return "1.5";
  if (value === 2) return "2.0 (çift)";
  return `${value}`;
}

function normalizeAlignment(align: string): string {
  const lower = align.toLowerCase().trim();

  const map: Record<string, string> = {
    both: "justify",
    justify: "justify",
    left: "left",
    right: "right",
    center: "center",
    centre: "center",
  };

  return map[lower] ?? lower;
}
