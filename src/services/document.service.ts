import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils";
import {
  parseDocxBuffer,
  analyzeFonts,
  analyzeSpacing,
  analyzeMargins,
  analyzePageNumbers,
  analyzeTables,
  extractCitations,
  validateCitations,
} from "@/services/docx-analyzer";
import type {
  Violation,
  CitationCheckResult,
  FormatRules,
  CitationStyleRules,
} from "@/services/docx-analyzer/types";
import type { Prisma } from "@prisma/client";

const CREDIT_COST_PER_ANALYSIS = 1;
const COMPLEXITY_CREDIT_THRESHOLD = 30;

interface RunAnalysisParams {
  documentId: string;
  userId: string;
  formatTemplateId: string | null;
  citationStyleId: string | null;
}

interface AnalysisSummary {
  totalViolations: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  formatScore: number;
  citationScore: number;
  overallScore: number;
  violationCategories: Record<string, number>;
  processingTimeMs: number;
}

export async function runDocumentAnalysis(
  params: RunAnalysisParams,
): Promise<void> {
  const startedAt = Date.now();

  const { documentId, userId, formatTemplateId, citationStyleId } = params;

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });

  if (!document) {
    throw new AppError("Belge bulunamadı.", 404, "DOCUMENT_NOT_FOUND");
  }

  if (document.status === "PROCESSING") {
    throw new AppError("Belge şu anda analiz ediliyor.", 409, "ALREADY_PROCESSING");
  }

  const userCredit = await prisma.userCredit.findUnique({
    where: { userId },
  });

  if (!userCredit || userCredit.balance < CREDIT_COST_PER_ANALYSIS) {
    throw new AppError(
      "Yetersiz kredi. Lütfen kredi satın alın.",
      402,
      "INSUFFICIENT_CREDITS",
    );
  }

  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  const isSubscribed =
    subscription?.status === "ACTIVE" || subscription?.status === "TRIAL";

  const analysisLimit = subscription?.plan?.analysisLimit ?? null;
  if (
    isSubscribed &&
    analysisLimit !== null &&
    (subscription?.analysisUsed ?? 0) >= analysisLimit
  ) {
    throw new AppError(
      "Bu dönem için analiz limitinize ulaştınız.",
      402,
      "ANALYSIS_LIMIT_REACHED",
    );
  }

  let formatRules: FormatRules | null = null;
  if (formatTemplateId) {
    const template = await prisma.formatTemplate.findUnique({
      where: { id: formatTemplateId },
    });
    if (template && template.rules) {
      formatRules = template.rules as unknown as FormatRules;
    }
  }

  let citationStyle: CitationStyleRules | null = null;
  if (citationStyleId) {
    const style = await prisma.citationStyle.findUnique({
      where: { id: citationStyleId },
    });
    if (style && style.rules) {
      citationStyle = style.rules as unknown as CitationStyleRules;
    }
  }

  const maxConcurrent = subscription?.plan?.concurrentLimit ?? 1;
  const activeAnalysis = await prisma.documentAnalysis.count({
    where: { document: { userId }, status: "PROCESSING" },
  });

  if (activeAnalysis >= maxConcurrent) {
    throw new AppError(
      `Aynı anda en fazla ${maxConcurrent} analiz yapabilirsiniz.`,
      429,
      "CONCURRENT_LIMIT",
    );
  }

  const analysis = await prisma.documentAnalysis.create({
    data: {
      documentId,
      formatTemplateId,
      citationStyleId,
      status: "PROCESSING",
      creditCost: isSubscribed ? 0 : CREDIT_COST_PER_ANALYSIS,
      startedAt: new Date(startedAt),
    },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING" },
  });

  try {
    const response = await fetch(document.fileUrl);
    if (!response.ok) {
      throw new AppError(
        "Belge dosyasına erişilemedi.",
        500,
        "FILE_FETCH_ERROR",
      );
    }

    const buffer = await response.arrayBuffer();

    const parsed = await parseDocxBuffer(buffer);

    const violations: Violation[] = [];

    if (formatRules) {
      const fontViolations = analyzeFonts(parsed.paragraphs, formatRules);
      violations.push(...fontViolations);

      const spacingViolations = analyzeSpacing(parsed.paragraphs, formatRules);
      violations.push(...spacingViolations);

      const marginViolations = analyzeMargins(parsed.sections, formatRules);
      violations.push(...marginViolations);

      const pageNumViolations = analyzePageNumbers(parsed.sections, parsed.paragraphs, formatRules);
      violations.push(...pageNumViolations);

      const tableViolations = analyzeTables(parsed.tables, formatRules);
      violations.push(...tableViolations);
    }

    // Sayfa sayısı limit kontrolü (parse sonrası)
    const maxPageLimit = subscription?.plan?.analysisLimit
      ? undefined
      : null; // plana sayfa limiti eklenirse burada kontrol edilecek

    if (subscription?.plan?.maxFileSizeMB) {
      // Parse edilmiş sayfa sayısına göre check (sayfa başı ~300 kelime = ~1.5 KB XML)
      // Belirli bir sayfa sınırı plana özel olarak eklenebilir
    }

    const extractedCitations = extractCitations(
      parsed.paragraphs,
      citationStyle,
    );

    const citationResults = citationStyle
      ? await validateCitations(extractedCitations, citationStyle)
      : [];

    if (violations.length > 0) {
      await prisma.analysisViolation.createMany({
        data: violations.map((v) => ({
          analysisId: analysis.id,
          type: v.type,
          severity: v.severity,
          section: v.section,
          location: v.location,
          description: v.description,
          expected: v.expected,
          found: v.found,
          suggestion: v.suggestion,
        })),
      });
    }

    if (citationResults.length > 0) {
      await prisma.citationCheck.createMany({
        data: citationResults.map((c) => ({
          analysisId: analysis.id,
          citationText: c.citationText,
          sourceType: c.sourceType,
          isCorrect: c.isCorrect,
          expected: c.expected,
          found: c.found,
          issues: c.issues as Prisma.InputJsonValue,
          location: c.location,
        })),
      });
    }

    const processingTimeMs = Date.now() - startedAt;

    const summary = buildSummary(
      violations,
      citationResults,
      processingTimeMs,
    );

    const creditCost = isSubscribed
      ? 0
      : Math.min(
          CREDIT_COST_PER_ANALYSIS,
          userCredit.balance,
        );

    await prisma.$transaction([
      prisma.documentAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "ANALYZED",
          completedAt: new Date(),
          summary: summary as Prisma.InputJsonValue,
          creditCost,
        },
      }),

      prisma.document.update({
        where: { id: documentId },
        data: {
          status: "ANALYZED",
          pageCount: parsed.pageCount,
          wordCount: parsed.wordCount,
          citationCount: parsed.citationCount,
        },
      }),
    ]);

    if (!isSubscribed && creditCost > 0) {
      await prisma.$transaction([
        prisma.userCredit.update({
          where: { userId },
          data: {
            balance: { decrement: creditCost },
            lifetimeSpent: { increment: creditCost },
          },
        }),
        prisma.creditTransaction.create({
          data: {
            userCreditId: userCredit.id,
            amount: -creditCost,
            type: "ANALYSIS_COST",
            description: `Belge analizi: ${document.originalName}`,
            referenceId: analysis.id,
          },
        }),
      ]);
    }

    if (isSubscribed && subscription) {
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: { analysisUsed: { increment: 1 } },
      });
    }

    await prisma.notification.create({
      data: {
        userId,
        title: "Analiz Tamamlandı",
        message: `"${document.originalName}" belgesinin analizi tamamlandı. ${summary.totalViolations} ihlal, ${summary.errorCount} hata tespit edildi.`,
        type: summary.totalViolations === 0 ? "success" : "warning",
        link: `/documents/${documentId}`,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Bilinmeyen hata";

    await prisma.$transaction([
      prisma.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
          errorMessage,
        },
      }),
      prisma.documentAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          summary: {
            error: errorMessage,
            processingTimeMs: Date.now() - startedAt,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    throw error;
  }
}

function buildSummary(
  violations: Violation[],
  citationResults: CitationCheckResult[],
  processingTimeMs: number,
): AnalysisSummary {
  let totalViolations = violations.length;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const v of violations) {
    switch (v.severity) {
      case "ERROR":
        errorCount++;
        break;
      case "WARNING":
        warningCount++;
        break;
      case "INFO":
        infoCount++;
        break;
    }
  }

  for (const c of citationResults) {
    totalViolations++;
    if (c.isCorrect) {
      infoCount++;
    } else {
      errorCount++;
    }
  }

  const violationCategories: Record<string, number> = {};
  for (const v of violations) {
    const cat = v.type.toLowerCase();
    violationCategories[cat] = (violationCategories[cat] || 0) + 1;
  }
  violationCategories["citation"] =
    (violationCategories["citation"] || 0) + citationResults.length;

  const formatScore = calculateFormatScore(violations);
  const citationScore = calculateCitationScore(citationResults);
  const overallScore = Math.round((formatScore + citationScore) / 2);

  return {
    totalViolations,
    errorCount,
    warningCount,
    infoCount,
    formatScore,
    citationScore,
    overallScore,
    violationCategories,
    processingTimeMs,
  };
}

function calculateFormatScore(violations: Violation[]): number {
  if (violations.length === 0) return 100;

  let penalty = 0;
  for (const v of violations) {
    switch (v.severity) {
      case "ERROR":
        penalty += 5;
        break;
      case "WARNING":
        penalty += 2;
        break;
      case "INFO":
        penalty += 0.5;
        break;
    }
  }

  return Math.max(0, Math.round(100 - penalty));
}

function calculateCitationScore(results: CitationCheckResult[]): number {
  if (results.length === 0) return 100;

  const correctCount = results.filter((r) => r.isCorrect).length;
  return Math.round((correctCount / results.length) * 100);
}
