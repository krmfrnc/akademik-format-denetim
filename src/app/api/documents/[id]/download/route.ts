import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiError } from "@/lib/utils";
import { fixFormatting } from "@/services/docx-analyzer";
import type { FormatRules } from "@/services/docx-analyzer/types";

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
          take: 1,
          include: {
            formatTemplate: {
              select: { id: true, name: true, rules: true },
            },
          },
        },
      },
    });

    if (!document) {
      return apiError("Belge bulunamadı.", 404, "NOT_FOUND");
    }

    const formatTemplate = document.analyses[0]?.formatTemplate;

    const response = await fetch(document.fileUrl);
    if (!response.ok) {
      return apiError("Belge dosyasına erişilemedi.", 500, "FILE_FETCH_ERROR");
    }

    const originalBuffer = await response.arrayBuffer();

    let outputBuffer = originalBuffer;

    if (formatTemplate?.rules) {
      try {
        const rules = formatTemplate.rules as unknown as FormatRules;
        outputBuffer = await fixFormatting(originalBuffer, rules);
      } catch (err) {
        console.error("Düzeltme hatası, orijinal dosya gönderiliyor:", err);
        outputBuffer = originalBuffer;
      }
    }

    const downloadName = `${document.originalName}_duzeltilmis.docx`;

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadName)}"`,
        "Content-Length": String(outputBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("GET /api/documents/[id]/download error:", error);
    return apiError("Dosya indirilirken bir hata oluştu.", 500);
  }
}
