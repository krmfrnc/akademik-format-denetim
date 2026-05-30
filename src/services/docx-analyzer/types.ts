import type { ViolationType, Severity, Prisma } from "@prisma/client";

export interface FormatRules {
  body?: SectionRules;
  heading1?: SectionRules;
  heading2?: SectionRules;
  heading3?: SectionRules;
  abstract?: SectionRules;
  footnote?: SectionRules;
  bibliography?: BibliographyRules;
  pageNumbers?: PageNumberRules;
  tables?: TableRules;
  [key: string]: unknown;
}

export interface SectionRules {
  fontFamily?: string;
  fontSize?: number;
  lineSpacing?: number;
  alignment?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  firstLineIndent?: string;
  bold?: boolean;
  italic?: boolean;
  paragraphSpacing?: number;
}

export interface BibliographyRules extends SectionRules {
  hangingIndent?: string;
}

export interface PageNumberRules {
  position?: string;
  fontSize?: number;
  format?: string;
  introRoman?: boolean;
}

export interface TableRules {
  insideBorders?: boolean;
}

export interface CitationStyleRules {
  inText?: Record<string, string>;
  bibliography?: Record<string, string>;
  authorFormat?: string;
  ordering?: string;
  hangingIndent?: string;
  [key: string]: unknown;
}

export interface Violation {
  type: ViolationType;
  severity: Severity;
  section: string | null;
  location: string | null;
  description: string;
  expected: string;
  found: string;
  suggestion: string | null;
}

export interface CitationCheckResult {
  citationText: string;
  sourceType: string | null;
  isCorrect: boolean;
  expected: string | null;
  found: string | null;
  issues: Prisma.JsonValue;
  location: string | null;
}

export interface ExtractedCitation {
  text: string;
  type: "inText" | "bibliography";
  location: string;
  sourceType?: string;
  authors?: string[];
  year?: number;
  title?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  publisher?: string;
  url?: string;
}

export interface DocxParagraph {
  index: number;
  styleId: string | null;
  styleName: string | null;
  text: string;
  alignment: string | null;
  lineSpacing: number | null;
  spacingBefore: number | null;
  spacingAfter: number | null;
  firstLineIndent: number | null;
  leftIndent: number | null;
  rightIndent: number | null;
  runs: DocxRun[];
}

export interface DocxRun {
  text: string;
  fontFamily: string | null;
  fontSize: number | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface DocxSection {
  pageWidth: number | null;
  pageHeight: number | null;
  marginTop: number | null;
  marginBottom: number | null;
  marginLeft: number | null;
  marginRight: number | null;
  pageNumberFormat: string | null;
  pageNumberStart: number | null;
}

export interface DocxTable {
  index: number;
  insideHorizontalBorder: boolean;
  insideVerticalBorder: boolean;
  rowCount: number;
  colCount: number;
}

export interface ParsedDocx {
  paragraphs: DocxParagraph[];
  sections: DocxSection[];
  tables: DocxTable[];
  rawText: string;
  pageCount: number;
  wordCount: number;
  citationCount: number;
}

export interface CrossrefWork {
  title?: string[];
  author?: { given?: string; family?: string; name?: string }[];
  DOI?: string;
  "published-print"?: { "date-parts": number[][] };
  "published-online"?: { "date-parts": number[][] };
  issued?: { "date-parts": number[][] };
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  publisher?: string;
  type?: string;
  URL?: string;
}

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors?: { name: string; authorId: string }[];
  year?: number;
  journal?: { name: string } | null;
  externalIds?: { DOI?: string; ArXiv?: string };
  url?: string;
  publicationVenue?: { name: string } | null;
}

export interface CrossrefResponse {
  status: string;
  message: {
    items: CrossrefWork[];
    "total-results": number;
  };
}

export interface SemanticScholarResponse {
  data: SemanticScholarPaper[];
  total: number;
}
