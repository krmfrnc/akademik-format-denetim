import type { DocxSection, FormatRules, Violation } from "./types";
import { twipsToCm, parseCmValue } from "./docx-parser";

export function analyzeMargins(
  sections: DocxSection[],
  rules: FormatRules,
): Violation[] {
  const violations: Violation[] = [];

  const bodyRule = rules.body;
  if (!bodyRule) return violations;

  const marginDefs: Array<{
    key: keyof DocxSection;
    ruleKey: keyof typeof bodyRule;
    type: "MARGIN_TOP" | "MARGIN_BOTTOM" | "MARGIN_LEFT" | "MARGIN_RIGHT";
    label: string;
  }> = [
    {
      key: "marginTop",
      ruleKey: "marginTop",
      type: "MARGIN_TOP",
      label: "üst",
    },
    {
      key: "marginBottom",
      ruleKey: "marginBottom",
      type: "MARGIN_BOTTOM",
      label: "alt",
    },
    {
      key: "marginLeft",
      ruleKey: "marginLeft",
      type: "MARGIN_LEFT",
      label: "sol",
    },
    {
      key: "marginRight",
      ruleKey: "marginRight",
      type: "MARGIN_RIGHT",
      label: "sağ",
    },
  ];

  for (let sectionIdx = 0; sectionIdx < sections.length; sectionIdx++) {
    const section = sections[sectionIdx];
    const sectionLabel =
      sections.length > 1 ? `Bölüm ${sectionIdx + 1}` : "Belge";

    for (const { key, ruleKey, type, label } of marginDefs) {
      const expectedValue = bodyRule[ruleKey] as string | undefined;
      if (!expectedValue) continue;

      const expectedCm = parseCmValue(expectedValue);
      if (expectedCm === null) continue;

      const actualTwips = section[key] as number | null;
      const tolerance = 50; // twips (~0.9 mm)

      if (actualTwips === null) {
        violations.push({
          type,
          severity: "WARNING",
          section: "body",
          location: sectionLabel,
          description: `${label} kenar boşluğu belirtilmemiş. Word varsayılanı kullanılıyor.`,
          expected: expectedValue,
          found: "belirtilmemiş",
          suggestion: `${label} kenar boşluğunu ${expectedValue} olarak ayarlayın.`,
        });
        continue;
      }

      const actualCm = twipsToCm(actualTwips);
      const expectedTwips = Math.round(expectedCm * 567);

      if (Math.abs(actualTwips - expectedTwips) > tolerance) {
        violations.push({
          type,
          severity: "ERROR",
          section: "body",
          location: sectionLabel,
          description: `${label} kenar boşluğu kurala uymuyor.`,
          expected: expectedValue,
          found: `${actualCm.toFixed(2)} cm`,
          suggestion: `${label} kenar boşluğunu ${expectedValue} olarak değiştirin.`,
        });
      }
    }
  }

  return violations;
}
