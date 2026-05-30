import type { ExtractedCitation, DocxParagraph, CitationStyleRules } from "./types";

const INLINE_CITATION_PATTERNS: Array<{
  pattern: RegExp;
  type: "inText";
  sourceType?: string;
}> = [
  {
    pattern: /\(([^)]+?),\s*(\d{4})\)/g,
    type: "inText",
  },
  {
    pattern: /\(([^)]+?)\s+et\s+al\s*\.\s*,\s*(\d{4})\)/gi,
    type: "inText",
  },
  {
    pattern: /\(([^)]+?)\s+vd\s*\.\s*,\s*(\d{4})\)/g,
    type: "inText",
  },
  {
    pattern: /\(([^)]+?)\s*&\s*([^,)]+)\s*,\s*(\d{4})\)/g,
    type: "inText",
  },
  {
    pattern: /\(([^)]+?)\s+and\s+([^,)]+)\s*,\s*(\d{4})\)/gi,
    type: "inText",
  },
];

const NARRATIVE_CITATION_PATTERN =
  /([A-ZŞĞÜÇİÖ][a-zşğüçıö]+(?:\s+(?:ve|and|&)\s+[A-ZŞĞÜÇİÖ][a-zşğüçıö]+)?(?:\s+vd\.)?(?:\s+et\s+al\.)?)\s*\((\d{4})\)/g;

const BIBLIOGRAPHY_HEADERS = [
  /^kaynak[çc]a\s*$/i,
  /^kaynaklar\s*$/i,
  /^references\s*$/i,
  /^bibliography\s*$/i,
  /^bibliyografya\s*$/i,
  /^referanslar\s*$/i,
];

const BIBLIOGRAPHY_ENTRY_PATTERNS = [
  /^([A-ZŞĞÜÇİÖ][a-zşğüçıö]+(?:,\s*[A-ZŞĞÜÇİÖ][a-zşğüçıö]+)*)\.?\s*\((\d{4})\)\.?\s+(.+)/,
  /^([A-ZŞĞÜÇİÖ][a-zşğüçıö]+(?:,\s*[A-ZŞĞÜÇİÖ]\.?)*)\.?\s+\((\d{4})\)\.?\s+(.+)/,
];

export function extractCitations(
  paragraphs: DocxParagraph[],
  _rules: CitationStyleRules | null,
): ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];
  const fullText = paragraphs.map((p) => p.text).join("\n");

  extractInTextCitationsFromFullText(fullText, citations);
  extractNarrativeCitationsFromFullText(fullText, citations);
  extractBibliographyEntries(paragraphs, citations);

  const unique = deduplicateCitations(citations);
  return unique;
}

function extractInTextCitationsFromFullText(
  text: string,
  citations: ExtractedCitation[],
): void {
  const processed = new Set<string>();

  for (const { pattern, type } of INLINE_CITATION_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const trimmed = fullMatch.trim();

      if (processed.has(trimmed)) continue;
      processed.add(trimmed);

      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(text.length, match.index + fullMatch.length + 50);
      const location = `"...${text.substring(contextStart, contextEnd).trim()}..."`;

      const authors = extractAuthorsFromInline(match);

      citations.push({
        text: trimmed,
        type,
        location,
        authors: authors.length > 0 ? authors : undefined,
        year: parseInt(match[match.length - 1], 10),
        sourceType: "article",
      });
    }
  }
}

function extractNarrativeCitationsFromFullText(
  text: string,
  citations: ExtractedCitation[],
): void {
  const pattern = new RegExp(NARRATIVE_CITATION_PATTERN.source, "g");
  const processed = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const fullMatch = match[0].trim();
    if (processed.has(fullMatch)) continue;
    processed.add(fullMatch);

    const contextStart = Math.max(0, match.index - 30);
    const contextEnd = Math.min(text.length, match.index + fullMatch.length + 30);
    const location = `"...${text.substring(contextStart, contextEnd).trim()}..."`;

    citations.push({
      text: fullMatch,
      type: "inText",
      location,
      authors: [match[1].trim()],
      year: parseInt(match[2], 10),
      sourceType: "article",
    });
  }
}

function extractBibliographyEntries(
  paragraphs: DocxParagraph[],
  citations: ExtractedCitation[],
): void {
  let bibStart = -1;

  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i].text.trim().toLowerCase();
    const isHeader = BIBLIOGRAPHY_HEADERS.some((pattern) => pattern.test(text));
    if (isHeader) {
      bibStart = i + 1;
      break;
    }
  }

  if (bibStart === -1) return;

  for (let i = bibStart; i < paragraphs.length; i++) {
    const text = paragraphs[i].text.trim();
    if (text.length < 10) continue;

    const isListEntry =
      /^\d+\.?\s|^\[\d+\]\s|^[A-ZŞĞÜÇİÖ]/.test(text) && text.length > 20;

    if (!isListEntry) {
      if (text.length < 5 && citations.length > 0) continue;
      if (citations.length > 0 && !text.match(/^[A-ZŞĞÜÇİÖ]/)) continue;
    }

    const parsed = parseBibliographyEntry(text);
    if (!parsed) continue;

    citations.push({
      text: text.substring(0, 300),
      type: "bibliography",
      location: `Kaynakça, ${parsed.sourceType || "kaynak"} tipi`,
      ...parsed,
    });
  }
}

function parseBibliographyEntry(
  text: string,
): Partial<ExtractedCitation> | null {
  const cleanText = text.replace(/^\d+\.?\s*|^\[\d+\]\s*/, "").trim();

  for (const pattern of BIBLIOGRAPHY_ENTRY_PATTERNS) {
    const match = cleanText.match(pattern);
    if (match) {
      const authorsStr = match[1].trim();
      const year = parseInt(match[2], 10);
      const rest = match[3].trim();

      const authors = authorsStr
        .split(/,\s*/)
        .map((a) => a.trim())
        .filter(Boolean);

      const sourceType = classifySourceType(rest);

      const result: Partial<ExtractedCitation> = {
        authors,
        year: isNaN(year) ? undefined : year,
        sourceType,
      };

      const titleMatch = rest.match(/^"([^"]+)"|^'([^']+)'/);
      if (titleMatch) {
        result.title = (titleMatch[1] || titleMatch[2]).trim();
      } else {
        const dotIdx = rest.indexOf(".");
        if (dotIdx > 0) {
          const possibleTitle = rest.substring(0, dotIdx).trim();
          if (possibleTitle.length < 200) {
            result.title = possibleTitle;
          }
        }
      }

      const doiMatch = rest.match(/\b(10\.\d{4,}\/[\w.\-/]+)\b/);
      if (doiMatch) {
        result.doi = doiMatch[1];
      }

      const urlMatch = rest.match(/\bhttps?:\/\/[^\s,]+\b/);
      if (urlMatch) {
        result.url = urlMatch[0];
      }

      const pagesMatch = rest.match(/\b(?:ss?\.|pp?\.|sayfa)?\s*(\d+[-–]\d+)\b/);
      if (pagesMatch) {
        result.pages = pagesMatch[1];
      }

      const journalMatch = rest.match(/\.\s*<em>([^<]+)<\/em>/);
      if (journalMatch) {
        result.journal = journalMatch[1].trim();
      }

      const volumeIssueMatch = rest.match(/\b(\d+)\s*\(\s*(\d+)\s*\)/);
      if (volumeIssueMatch) {
        result.volume = volumeIssueMatch[1];
        result.issue = volumeIssueMatch[2];
      }

      const publisherMatch = rest.match(
        /(?:yayın|yayınevi|publisher|press)[:\s]+([^,.]+)/i,
      );
      if (publisherMatch) {
        result.publisher = publisherMatch[1].trim();
      }

      return result;
    }
  }

  const hasAuthorYear = /^[A-ZŞĞÜÇİÖ][a-zşğüçıö]+.*\d{4}/.test(cleanText);
  if (hasAuthorYear) {
    return {
      sourceType: classifySourceType(cleanText),
    };
  }

  return null;
}

function classifySourceType(text: string): string {
  const lower = text.toLowerCase();

  if (/dergi|journal|makale|article/i.test(lower)) return "journalArticle";
  if (/kitap|book|yayınevi|publisher|press|basım/i.test(lower)) return "book";
  if (/tez|thesis|doktora|yüksek\s*lisans|master|phd/i.test(lower)) return "thesis";
  if (/kongre|sempozyum|conference|proceeding|bildiri/i.test(lower)) return "proceeding";
  if (/rapor|report|teknik\s*rapor/i.test(lower)) return "report";
  if (/web|internet|url|http|erişim|online/i.test(lower)) return "website";

  return "article";
}

function extractAuthorsFromInline(match: RegExpExecArray): string[] {
  const authorPart = match[1]?.trim();
  if (!authorPart) return [];

  if (authorPart.includes("&")) {
    return authorPart.split("&").map((a) => a.trim()).filter(Boolean);
  }
  if (authorPart.includes(" and ")) {
    return authorPart.split(/\s+and\s+/i).map((a) => a.trim()).filter(Boolean);
  }
  if (/vd\./i.test(authorPart)) {
    const firstAuthor = authorPart.replace(/\s+vd\./i, "").trim();
    return [firstAuthor];
  }
  if (/et\s+al\./i.test(authorPart)) {
    const firstAuthor = authorPart.replace(/\s+et\s+al\./i, "").trim();
    return [firstAuthor];
  }

  return [authorPart];
}

function deduplicateCitations(citations: ExtractedCitation[]): ExtractedCitation[] {
  const seen = new Set<string>();
  const result: ExtractedCitation[] = [];

  for (const citation of citations) {
    const key = `${citation.text}|${citation.type}|${citation.authors?.join(",") ?? ""}|${citation.year ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(citation);
  }

  return result;
}
