import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";
import { parseDocxBuffer } from "@/services/docx-analyzer";
import { parsedDocxToHtml } from "@/services/docx-to-html";

export const dynamic = "force-dynamic";

async function fetchFileBuffer(fileUrl: string): Promise<ArrayBuffer | null> {
  if (fileUrl.includes("blob.vercel-storage.com")) {
    let fetchUrl = fileUrl;
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      fetchUrl = fileUrl.includes("?")
        ? `${fileUrl}&token=${token}`
        : `${fileUrl}?token=${token}`;
    }
    const response = await fetch(fetchUrl);
    if (!response.ok) return null;
    return response.arrayBuffer();
  }

  if (fileUrl.startsWith("/api/documents/file/")) {
    const relativePath = fileUrl.replace("/api/documents/file/", "");

    const storageConfig = await prisma.systemConfig.findUnique({
      where: { key: "storage.local_path" },
    });
    const storagePath = (storageConfig?.value as string) ?? "/uploads/documents";
    const absolutePath = `${process.cwd()}/${storagePath}/${relativePath}`;

    const fs = await import("fs/promises");
    try {
      const buffer = await fs.readFile(absolutePath);
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
    } catch {
      return null;
    }
  }

  const response = await fetch(fileUrl);
  if (!response.ok) return null;
  return response.arrayBuffer();
}

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
            violations: {
              orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
    });

    if (!document) {
      return apiError("Belge bulunamadı.", 404, "NOT_FOUND");
    }

    const arrayBuffer = await fetchFileBuffer(document.fileUrl);
    if (arrayBuffer === null) {
      return apiError("Belge dosyasına erişilemedi.", 500, "FILE_FETCH_ERROR");
    }

    const parsed = await parseDocxBuffer(arrayBuffer);
    const { html } = parsedDocxToHtml(parsed);

    const violations = document.analyses[0]?.violations ?? [];

    return apiSuccess({
      html,
      documentName: document.originalName,
      violations: violations.map((v) => ({
        id: v.id,
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
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("GET /api/documents/[id]/html error:", error);
    return apiError("Belge HTML içeriği alınırken bir hata oluştu.", 500);
  }
}
