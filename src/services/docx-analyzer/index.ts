export { parseDocxBuffer, classifyParagraphSection, twipsToCm, cmToTwips, parseCmValue } from "./docx-parser";
export { analyzeFonts } from "./font.analyzer";
export { analyzeSpacing } from "./spacing.analyzer";
export { analyzeMargins } from "./margin.analyzer";
export { analyzePageNumbers } from "./page-number.analyzer";
export { analyzeTables } from "./table.analyzer";
export { extractCitations } from "./citation.extractor";
export { validateCitations } from "./citation.validator";
export { fixFormatting } from "./docx-modifier";
export type {
  Violation,
  CitationCheckResult,
  FormatRules,
  CitationStyleRules,
  ExtractedCitation,
  ParsedDocx,
  DocxParagraph,
  DocxRun,
  DocxSection,
  DocxTable,
  SectionRules,
  BibliographyRules,
  PageNumberRules,
  TableRules,
} from "./types";
