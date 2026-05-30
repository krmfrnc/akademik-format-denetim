import type { DocxSection, DocxParagraph, FormatRules, Violation } from "./types";

const INTRODUCTION_KEYWORDS = [
  "giriş", "gİrİş", "giris",
  "introduction",
  "1. giriş", "1. gİrİş",
  "bÖlÜm 1", "bölüm 1", "bolum 1",
];

export function analyzePageNumbers(
  sections: DocxSection[],
  paragraphs: DocxParagraph[],
  rules: FormatRules,
): Violation[] {
  const violations: Violation[] = [];

  const pageNumberRule = rules.pageNumbers;
  if (!pageNumberRule) return violations;

  const introRoman = pageNumberRule.introRoman;
  if (!introRoman) return violations;

  const introIdx = findIntroductionIndex(paragraphs);

  if (sections.length <= 1 && introIdx === -1) {
    if (sections.length === 1 && sections[0].pageNumberFormat) {
      const fmt = sections[0].pageNumberFormat;
      if (!isRoman(fmt)) {
        violations.push({
          type: "PAGE_NUMBER",
          severity: "WARNING",
          section: "body",
          location: "Belge geneli",
          description: "Sayfa numarası formatı Romen rakamı olmalıdır.",
          expected: "upperRoman veya lowerRoman",
          found: fmt ?? "belirtilmemiş",
          suggestion: "Giriş bölümü için sayfa numarası formatını Romen rakamı olarak ayarlayın (I, II, III...).",
        });
      }
    }
    return violations;
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const isBeforeIntro = introIdx === -1 || i === 0;
    const expectedFormat = isBeforeIntro ? "roman" : "decimal";

    const actualFormat = section.pageNumberFormat;
    if (!actualFormat) continue;

    const isCurrentlyRoman = isRoman(actualFormat);
    const isCurrentlyDecimal = actualFormat === "decimal" || actualFormat === "none" || !actualFormat;

    if (expectedFormat === "roman" && !isCurrentlyRoman) {
      violations.push({
        type: "PAGE_NUMBER",
        severity: "ERROR",
        section: "body",
        location: `Bölüm ${i + 1}`,
        description:
          "Giriş öncesi bölümlerde sayfa numaraları Romen rakamı olmalıdır.",
        expected: "Romen rakamı (upperRoman / lowerRoman)",
        found: actualFormat,
        suggestion:
          "Bu bölümün sayfa numarası formatını Romen rakamı olarak değiştirin.",
      });
    }

    if (expectedFormat === "decimal" && isCurrentlyRoman) {
      violations.push({
        type: "PAGE_NUMBER",
        severity: "ERROR",
        section: "body",
        location: `Bölüm ${i + 1}`,
        description:
          "Giriş ve sonrasındaki bölümlerde sayfa numaraları Arap rakamı olmalıdır.",
        expected: "decimal",
        found: actualFormat,
        suggestion:
          "Bu bölümün sayfa numarası formatını Arap rakamı (1, 2, 3...) olarak değiştirin.",
      });
    }
  }

  return violations;
}

function isRoman(format: string): boolean {
  const lower = format.toLowerCase();
  return lower === "upperroman" || lower === "lowerroman";
}

function findIntroductionIndex(paragraphs: DocxParagraph[]): number {
  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i].text.trim().toLowerCase();
    for (const keyword of INTRODUCTION_KEYWORDS) {
      if (text.startsWith(keyword) || text === keyword) {
        return i;
      }
    }
  }

  for (let i = 0; i < paragraphs.length; i++) {
    const styleName = paragraphs[i].styleName?.toLowerCase() ?? "";
    if (styleName.includes("heading 1") || styleName.includes("başlık 1")) {
      const text = paragraphs[i].text.trim().toLowerCase();
      if (
        text.includes("giriş") ||
        text.includes("giris") ||
        text.includes("introduction")
      ) {
        return i;
      }
    }
  }

  return -1;
}
