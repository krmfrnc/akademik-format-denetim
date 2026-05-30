import type { DocxTable, FormatRules, Violation } from "./types";

export function analyzeTables(
  tables: DocxTable[],
  rules: FormatRules,
): Violation[] {
  const violations: Violation[] = [];

  const tableRule = rules.tables;
  if (!tableRule) return violations;

  const requireInsideBorders = tableRule.insideBorders;
  if (!requireInsideBorders) return violations;

  for (const table of tables) {
    if (!table.insideHorizontalBorder) {
      violations.push({
        type: "OTHER",
        severity: "WARNING",
        section: "body",
        location: `Tablo ${table.index + 1} (${table.rowCount}x${table.colCount})`,
        description:
          "Tabloda iç yatay çizgiler (insideH) bulunamadı. Akademik tablolarda satır arası çizgiler olmalıdır.",
        expected: "İç yatay çizgiler mevcut",
        found: "İç yatay çizgiler eksik",
        suggestion:
          "Tablo özelliklerinden iç yatay kenar çizgilerini (Inside Horizontal Border) etkinleştirin.",
      });
    }

    if (!table.insideVerticalBorder) {
      violations.push({
        type: "OTHER",
        severity: "WARNING",
        section: "body",
        location: `Tablo ${table.index + 1} (${table.rowCount}x${table.colCount})`,
        description:
          "Tabloda iç dikey çizgiler (insideV) bulunamadı. Akademik tablolarda sütun arası çizgiler olmalıdır.",
        expected: "İç dikey çizgiler mevcut",
        found: "İç dikey çizgiler eksik",
        suggestion:
          "Tablo özelliklerinden iç dikey kenar çizgilerini (Inside Vertical Border) etkinleştirin.",
      });
    }
  }

  return violations;
}
