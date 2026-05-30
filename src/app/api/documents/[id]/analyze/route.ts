import { NextRequest } from "next/server";
import { enqueueAnalysis } from "@/services/document.service";
import { getAuthUser } from "@/lib/get-auth-user";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const documentId = params.id;
    if (!documentId) {
      return apiError("Belge ID gereklidir.", 400, "MISSING_DOCUMENT_ID");
    }

    let formatTemplateId: string | null = null;
    let citationStyleId: string | null = null;

    try {
      const body = await request.json();
      formatTemplateId = body.formatTemplateId ?? null;
      citationStyleId = body.citationStyleId ?? null;
    } catch {
      // JSON body olmayabilir, sadece belge analizi
    }

    const { analysisId } = await enqueueAnalysis({
      documentId,
      userId: user.sub,
      formatTemplateId,
      citationStyleId,
    });

    return apiSuccess(
      {
        documentId,
        analysisId,
        message: "Analiz kuyruğa alındı. Sonuçlar hazır olduğunda bildirileceksiniz.",
      },
      202,
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }

    console.error("POST /api/documents/[id]/analyze error:", error);
    return apiError("Analiz başlatılırken bir hata oluştu.", 500, "ANALYSIS_ERROR");
  }
}
