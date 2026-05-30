import type { DocxParagraph, DocxRun, FormatRules, Violation } from "./types";
import { classifyParagraphSection } from "./docx-parser";

export function analyzeFonts(
  paragraphs: DocxParagraph[],
  rules: FormatRules,
): Violation[] {
  const violations: Violation[] = [];

  const sectionRules = extractSectionRules(rules);

  for (const para of paragraphs) {
    if (!para.runs.length || para.text.trim().length === 0) continue;

    const section = classifyParagraphSection(para);
    const rule = sectionRules[section];

    if (!rule) continue;

    for (const run of para.runs) {
      if (run.text.trim().length === 0) continue;

      checkFontFamily(para, run, rule, section, violations);
      checkFontSize(para, run, rule, section, violations);
      checkBold(para, run, rule, section, violations);
      checkItalic(para, run, rule, section, violations);
    }
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

function checkFontFamily(
  para: DocxParagraph,
  run: DocxRun,
  rule: Record<string, unknown>,
  section: string,
  violations: Violation[],
): void {
  const expected = rule.fontFamily as string | undefined;
  if (!expected) return;

  const found = run.fontFamily ?? "belirtilmemiş (varsayılan)";

  if (
    run.fontFamily &&
    run.fontFamily.toLowerCase() !== expected.toLowerCase()
  ) {
    violations.push({
      type: "FONT_FAMILY",
      severity: "ERROR",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde font ailesi kurala uymuyor.`,
      expected,
      found,
      suggestion: `Font ailesini "${expected}" olarak değiştirin.`,
    });
    return;
  }

  if (!run.fontFamily && run.text.trim().length > 3) {
    violations.push({
      type: "FONT_FAMILY",
      severity: "WARNING",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde font ailesi açıkça belirtilmemiş. Word varsayılan fontu kullanılıyor.`,
      expected,
      found: "belirtilmemiş",
      suggestion: `Tüm metne "${expected}" fontunu uygulayın.`,
    });
  }
}

function checkFontSize(
  para: DocxParagraph,
  run: DocxRun,
  rule: Record<string, unknown>,
  section: string,
  violations: Violation[],
): void {
  const expected = rule.fontSize as number | undefined;
  if (!expected) return;

  const found = run.fontSize !== null ? `${run.fontSize} punto` : "belirtilmemiş";

  if (run.fontSize !== null && run.fontSize !== expected) {
    violations.push({
      type: "FONT_SIZE",
      severity: "ERROR",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde font boyutu kurala uymuyor.`,
      expected: `${expected} punto`,
      found,
      suggestion: `Font boyutunu ${expected} punto olarak değiştirin.`,
    });
  }
}

function checkBold(
  para: DocxParagraph,
  run: DocxRun,
  rule: Record<string, unknown>,
  section: string,
  violations: Violation[],
): void {
  if (rule.bold === undefined) return;

  const expected = rule.bold as boolean;
  const status = run.bold ? "kalın" : "normal";

  if (run.bold !== expected) {
    violations.push({
      type: "BOLD",
      severity: expected ? "ERROR" : "WARNING",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde metin ${expected ? "kalın olmalı" : "kalın olmamalı"}.`,
      expected: expected ? "Kalın" : "Normal",
      found: status,
      suggestion: expected
        ? "Metni kalın (Bold) yapın."
        : "Kalın biçimlendirmeyi kaldırın.",
    });
  }
}

function checkItalic(
  para: DocxParagraph,
  run: DocxRun,
  rule: Record<string, unknown>,
  section: string,
  violations: Violation[],
): void {
  if (rule.italic === undefined) return;

  const expected = rule.italic as boolean;
  const status = run.italic ? "italik" : "düz";

  if (run.italic !== expected) {
    violations.push({
      type: "ITALIC",
      severity: expected ? "ERROR" : "WARNING",
      section,
      location: `Paragraf ${para.index + 1}`,
      description: `${section} bölümünde metin ${expected ? "italik olmalı" : "italik olmamalı"}.`,
      expected: expected ? "İtalik" : "Düz",
      found: status,
      suggestion: expected
        ? "Metni italik (Italic) yapın."
        : "İtalik biçimlendirmeyi kaldırın.",
    });
  }
}
