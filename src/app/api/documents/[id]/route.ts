import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";
import { deleteDocument } from "@/services/document.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const document = await prisma.document.findFirst({
      where: { id: params.id, userId: user.sub },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          include: {
            formatTemplate: {
              select: { id: true, name: true },
            },
            citationStyle: {
              select: { id: true, name: true },
            },
            violations: {
              orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
            },
            citationResults: {
              orderBy: [{ isCorrect: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
    });

    if (!document) {
      return apiError("Belge bulunamadı.", 404, "NOT_FOUND");
    }

    const lastAnalysis = document.analyses[0] ?? null;

    return apiSuccess({
      id: document.id,
      fileName: document.fileName,
      originalName: document.originalName,
      fileUrl: document.fileUrl,
      fileSize: document.fileSize,
      status: document.status,
      pageCount: document.pageCount,
      wordCount: document.wordCount,
      citationCount: document.citationCount,
      errorMessage: document.errorMessage,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      analysis: lastAnalysis
        ? {
            id: lastAnalysis.id,
            status: lastAnalysis.status,
            creditCost: lastAnalysis.creditCost,
            summary: lastAnalysis.summary,
            startedAt: lastAnalysis.startedAt,
            completedAt: lastAnalysis.completedAt,
            formatTemplate: lastAnalysis.formatTemplate,
            citationStyle: lastAnalysis.citationStyle,
            violations: lastAnalysis.violations,
            citationResults: lastAnalysis.citationResults,
          }
        : null,
      allAnalyses: document.analyses.map((a) => ({
        id: a.id,
        status: a.status,
        summary: a.summary,
        completedAt: a.completedAt,
      })),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("GET /api/documents/[id] error:", error);
    return apiError("Belge bilgileri alınırken bir hata oluştu.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    await deleteDocument(params.id, user.sub);

    return apiSuccess({ message: "Belge silindi." });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("DELETE /api/documents/[id] error:", error);
    return apiError("Belge silinirken bir hata oluştu.", 500);
  }
}
