import type {
  ExtractedCitation,
  CitationCheckResult,
  CitationStyleRules,
  CrossrefResponse,
  SemanticScholarResponse,
  CrossrefWork,
} from "./types";
import type { Prisma } from "@prisma/client";

const CROSSREF_API = "https://api.crossref.org/works";
const SEMANTIC_SCHOLAR_API =
  "https://api.semanticscholar.org/graph/v1/paper/search";

const USER_AGENT =
  "AkademikFormatDenetim/1.0 (mailto:info@akademikformat.com)";

const REQUEST_TIMEOUT_MS = 8000;

export async function validateCitations(
  citations: ExtractedCitation[],
  styleRules: CitationStyleRules | null,
  signal?: AbortSignal,
): Promise<CitationCheckResult[]> {
  const results: CitationCheckResult[] = [];
  const concurrency = 3;

  for (let i = 0; i < citations.length; i += concurrency) {
    const batch = citations.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((c) => validateSingleCitation(c, styleRules, signal)),
    );
    results.push(...batchResults);
  }

  return results;
}

async function validateSingleCitation(
  citation: ExtractedCitation,
  styleRules: CitationStyleRules | null,
  signal?: AbortSignal,
): Promise<CitationCheckResult> {
  const query = buildSearchQuery(citation);
  if (!query) {
    return {
      citationText: citation.text,
      sourceType: citation.sourceType ?? null,
      isCorrect: true,
      expected: null,
      found: null,
      issues: null,
      location: citation.location,
    };
  }

  try {
    const work = await searchCrossref(query, signal);

    if (!work) {
      const ssWork = await searchSemanticScholar(query, signal);
      if (!ssWork) {
        return {
          citationText: citation.text,
          sourceType: citation.sourceType ?? null,
          isCorrect: true,
          expected: null,
          found: null,
          issues: { warning: "Doğrulama için kaynak bulunamadı." } as Prisma.JsonValue,
          location: citation.location,
        };
      }

      return buildResultFromSemanticScholar(citation, ssWork, styleRules);
    }

    return buildResultFromCrossref(citation, work, styleRules);
  } catch {
    return {
      citationText: citation.text,
      sourceType: citation.sourceType ?? null,
      isCorrect: true,
      expected: null,
      found: null,
      issues: { warning: "API doğrulama hatası. Kaynak manuel kontrol edilmeli." } as Prisma.JsonValue,
      location: citation.location,
    };
  }
}

function buildSearchQuery(citation: ExtractedCitation): string | null {
  if (citation.doi) return citation.doi;

  if (citation.title) {
    return citation.title.substring(0, 200);
  }

  if (citation.authors && citation.authors.length > 0 && citation.year) {
    return `${citation.authors[0]} ${citation.year}`;
  }

  if (citation.authors && citation.authors.length > 0) {
    return citation.authors[0];
  }

  const text = citation.text
    .replace(/[()]/g, "")
    .replace(/vd\./gi, "")
    .replace(/et al\./gi, "")
    .trim();

  if (text.length > 5) return text.substring(0, 200);

  return null;
}

async function searchCrossref(
  query: string,
  signal?: AbortSignal,
): Promise<CrossrefWork | null> {
  try {
    const isDoi = /^10\.\d{4,}\//.test(query);

    const url = isDoi
      ? `${CROSSREF_API}/${encodeURIComponent(query)}`
      : `${CROSSREF_API}?query=${encodeURIComponent(query)}&rows=1`;

    const fetchSignal = signal
      ? AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), signal])
      : AbortSignal.timeout(REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: fetchSignal,
    });

    if (!response.ok) return null;

    const data: CrossrefResponse = await response.json();

    if (isDoi) {
      return (data.message as unknown as CrossrefWork) ?? null;
    }

    const items = data.message?.items;
    if (!items || items.length === 0) return null;

    return items[0];
  } catch {
    return null;
  }
}

async function searchSemanticScholar(
  query: string,
  signal?: AbortSignal,
): Promise<SemanticScholarResponse["data"][0] | null> {
  try {
    const url = `${SEMANTIC_SCHOLAR_API}?query=${encodeURIComponent(query)}&limit=1&fields=title,authors,year,journal,externalIds,publicationVenue,url`;

    const fetchSignal = signal
      ? AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), signal])
      : AbortSignal.timeout(REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: fetchSignal,
    });

    if (!response.ok) return null;

    const data: SemanticScholarResponse = await response.json();

    if (!data.data || data.data.length === 0) return null;

    return data.data[0];
  } catch {
    return null;
  }
}

function buildResultFromCrossref(
  citation: ExtractedCitation,
  work: CrossrefWork,
  styleRules: CitationStyleRules | null,
): CitationCheckResult {
  const issues: Record<string, unknown> = {};
  let isCorrect = true;

  const actualYear = work["published-print"]?.["date-parts"]?.[0]?.[0]
    ?? work["published-online"]?.["date-parts"]?.[0]?.[0]
    ?? work.issued?.["date-parts"]?.[0]?.[0];

  if (citation.year && actualYear && citation.year !== actualYear) {
    issues.year = {
      found: citation.year,
      expected: actualYear,
      message: `Yıl hatalı: ${citation.year} yerine ${actualYear} olmalı.`,
    };
    isCorrect = false;
  }

  const actualTitle = work.title?.[0] ?? "";
  if (
    citation.title &&
    actualTitle &&
    !titlesAreSimilar(citation.title, actualTitle)
  ) {
    issues.title = {
      found: citation.title,
      expected: actualTitle,
      message: "Başlık Crossref kaydıyla uyuşmuyor.",
    };
    isCorrect = false;
  }

  if (work.author && work.author.length > 0 && citation.authors && citation.authors.length > 0) {
    const workAuthors = work.author.map(
      (a) => `${a.family ?? ""} ${a.given ?? ""}`.trim(),
    );
    const missingAuthors = findMissingAuthors(citation.authors, workAuthors);

    if (missingAuthors.length > 0) {
      issues.authors = {
        found: citation.authors,
        expected: workAuthors,
        missing: missingAuthors,
        message: `Yazar listesi eksik olabilir: ${missingAuthors.join(", ")}.`,
      };
      isCorrect = false;
    }
  }

  if (citation.pages && work.page) {
    const normalizedFound = citation.pages.replace(/[-–]/g, "-");
    const normalizedExpected = work.page.replace(/[-–]/g, "-");
    if (normalizedFound !== normalizedExpected) {
      issues.pages = {
        found: citation.pages,
        expected: work.page,
        message: `Sayfa numaraları uyuşmuyor.`,
      };
      isCorrect = false;
    }
  }

  if (!work.DOI && citation.type === "bibliography") {
    issues.doi = {
      found: citation.doi ?? "yok",
      expected: null,
      message: "DOI bulunamadı. Kaynağa DOI eklenmesi önerilir.",
    };
  }

  if (work.DOI && !citation.doi && citation.type === "bibliography") {
    issues.doi = {
      found: "yok",
      expected: work.DOI,
      message: `DOI eksik: ${work.DOI}`,
    };
    isCorrect = false;
  }

  const expected = styleRules
    ? formatCitationFromCrossref(work, styleRules, citation.sourceType)
    : null;

  return {
    citationText: citation.text,
    sourceType: citation.sourceType ?? "article",
    isCorrect,
    expected: isCorrect ? null : expected,
    found: isCorrect ? null : citation.text,
    issues: Object.keys(issues).length > 0 ? (issues as unknown as Prisma.JsonValue) : null,
    location: citation.location,
  };
}

function buildResultFromSemanticScholar(
  citation: ExtractedCitation,
  paper: SemanticScholarResponse["data"][0],
  styleRules: CitationStyleRules | null,
): CitationCheckResult {
  const issues: Record<string, unknown> = {};
  let isCorrect = true;

  if (citation.year && paper.year && citation.year !== paper.year) {
    issues.year = {
      found: citation.year,
      expected: paper.year,
      message: `Yıl hatalı: ${citation.year} yerine ${paper.year} olmalı.`,
    };
    isCorrect = false;
  }

  if (citation.title && paper.title && !titlesAreSimilar(citation.title, paper.title)) {
    issues.title = {
      found: citation.title,
      expected: paper.title,
      message: "Başlık Semantic Scholar kaydıyla uyuşmuyor.",
    };
    isCorrect = false;
  }

  if (paper.authors && paper.authors.length > 0 && citation.authors && citation.authors.length > 0) {
    const paperAuthors = paper.authors.map((a) => a.name);
    const missingAuthors = findMissingAuthors(citation.authors, paperAuthors);

    if (missingAuthors.length > 0) {
      issues.authors = {
        found: citation.authors,
        expected: paperAuthors,
        missing: missingAuthors,
        message: `Yazar listesi eksik olabilir.`,
      };
      isCorrect = false;
    }
  }

  if (paper.externalIds?.DOI && !citation.doi && citation.type === "bibliography") {
    issues.doi = {
      found: "yok",
      expected: paper.externalIds.DOI,
      message: `DOI eksik: ${paper.externalIds.DOI}`,
    };
    isCorrect = false;
  }

  return {
    citationText: citation.text,
    sourceType: citation.sourceType ?? "article",
    isCorrect,
    expected: isCorrect ? null : paper.title,
    found: isCorrect ? null : citation.text,
    issues: Object.keys(issues).length > 0 ? (issues as unknown as Prisma.JsonValue) : null,
    location: citation.location,
  };
}

function titlesAreSimilar(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ]/g, "")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return true;
  if (na.length === 0 || nb.length === 0) return false;

  if (na.includes(nb) || nb.includes(na)) return true;

  let matches = 0;
  const minLen = Math.min(na.length, nb.length);
  for (let i = 0; i < minLen; i++) {
    if (na[i] === nb[i]) matches++;
  }

  return matches / minLen > 0.7;
}

function findMissingAuthors(citationAuthors: string[], workAuthors: string[]): string[] {
  const missing: string[] = [];
  const lowerCitation = citationAuthors.map((a) => a.toLowerCase());
  const lowerWork = workAuthors.map((a) => a.toLowerCase());

  for (const workAuthor of workAuthors) {
    const lower = workAuthor.toLowerCase();
    const found = lowerCitation.some(
      (ca) => ca.includes(lower) || lower.includes(ca),
    );
    if (!found) {
      missing.push(workAuthor);
    }
  }

  return missing;
}

function formatCitationFromCrossref(
  work: CrossrefWork,
  style: CitationStyleRules,
  sourceType?: string,
): string {
  try {
    const type = sourceType || classifyCrossrefType(work.type);

    const template = style.bibliography?.[type];
    if (!template) return "";

    const authors = (work.author ?? [])
      .map((a) => formatAuthorName(a, style))
      .join(", ");

    const year =
      work["published-print"]?.["date-parts"]?.[0]?.[0]
      ?? work["published-online"]?.["date-parts"]?.[0]?.[0]
      ?? work.issued?.["date-parts"]?.[0]?.[0]
      ?? "";

    const title = work.title?.[0] ?? "";
    const journal = work["container-title"]?.[0] ?? "";
    const volume = work.volume ?? "";
    const issue = work.issue ?? "";
    const pages = work.page ?? "";
    const publisher = work.publisher ?? "";
    const doi = work.DOI ?? "";
    const url = work.URL ?? "";

    return template
      .replace("{author}", authors)
      .replace("{year}", String(year))
      .replace("{title}", title)
      .replace("<em>{title}</em>", `<em>${title}</em>`)
      .replace("{journal}", journal)
      .replace("<em>{journal}</em>", `<em>${journal}</em>`)
      .replace("{volume}", volume)
      .replace("{issue}", issue)
      .replace("{pages}", pages)
      .replace("{publisher}", publisher)
      .replace("{doi}", doi)
      .replace("{url}", url)
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function formatAuthorName(
  author: { given?: string; family?: string; name?: string },
  style: CitationStyleRules,
): string {
  const lastName = author.family ?? author.name ?? "";
  const firstName = author.given ?? "";

  const format = style.authorFormat ?? "{lastName}, {firstNameInitial}.";

  const initial = firstName
    ? firstName
        .split(/\s+/)
        .map((n) => n.charAt(0).toUpperCase() + ".")
        .join(" ")
    : "";

  return format
    .replace("{lastName}", lastName)
    .replace("{firstName}", firstName)
    .replace("{firstNameInitial}", initial);
}

function classifyCrossrefType(crossrefType?: string): string {
  if (!crossrefType) return "journalArticle";

  const lower = crossrefType.toLowerCase();

  if (lower.includes("journal")) return "journalArticle";
  if (lower.includes("book")) return "book";
  if (lower.includes("dissertation")) return "thesis";
  if (lower.includes("proceeding")) return "proceeding";
  if (lower.includes("report")) return "report";
  if (lower.includes("web")) return "website";

  return "journalArticle";
}
