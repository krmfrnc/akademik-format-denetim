import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";
import { parseDocxBuffer } from "@/services/docx-analyzer";
import type { DocxParagraph, DocxRun } from "@/services/docx-analyzer/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mapAlignment(alignment: string | null): string | null {
  if (!alignment) return null;
  const a = alignment.toLowerCase();
  if (a === "both" || a === "distribute") return "justify";
  if (a === "center" || a === "left" || a === "right" || a === "justify") return a;
  return null;
}

function buildRunSpan(run: DocxRun): string {
  const text = escapeHtml(run.text || "");
  if (!text) return "";

  const styles: string[] = [];
  if (run.fontFamily) {
    styles.push(`font-family: '${run.fontFamily.replace(/'/g, "")}'`);
  }
  if (typeof run.fontSize === "number" && run.fontSize > 0) {
    styles.push(`font-size: ${run.fontSize}pt`);
  }

  let html = text;
  if (run.bold) html = `<strong>${html}</strong>`;
  if (run.italic) html = `<em>${html}</em>`;
  if (run.underline) html = `<u>${html}</u>`;

  if (styles.length > 0) {
    html = `<span style="${styles.join("; ")}">${html}</span>`;
  }
  return html;
}

function paragraphToHtml(para: DocxParagraph, index: number): string {
  const attrs: string[] = [`data-para-index="${index}"`];

  const align = mapAlignment(para.alignment);
  const styles: string[] = [];
  if (align && align !== "left") {
    styles.push(`text-align: ${align}`);
  }
  if (styles.length > 0) {
    attrs.push(`style="${styles.join("; ")}"`);
  }

  let inner = "";
  if (para.runs && para.runs.length > 0) {
    for (const run of para.runs) {
      inner += buildRunSpan(run);
    }
  } else if (para.text) {
    inner = escapeHtml(para.text);
  }

  if (!inner) {
    return `<p ${attrs.join(" ")}></p>`;
  }
  return `<p ${attrs.join(" ")}>${inner}</p>`;
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
      select: { id: true, fileUrl: true },
    });

    if (!document) {
      return apiError("Belge bulunamadı.", 404, "NOT_FOUND");
    }

    const isVercelBlob = document.fileUrl.includes("blob.vercel-storage.com");
    const isCustomStorage = document.fileUrl.startsWith("/storage/");
    let buffer: ArrayBuffer;

    if (isVercelBlob) {
      const { get } = await import("@vercel/blob");
      const blobResult = await get(document.fileUrl, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
        access: "private",
      });
      if (!blobResult) {
        return apiError("Belge dosyasına erişilemedi.", 500, "FILE_FETCH_ERROR");
      }
      buffer = await new Response(blobResult.stream).arrayBuffer();
    } else {
      let fetchUrl = document.fileUrl;
      if (isCustomStorage) {
        const storageBase = process.env.STORAGE_SERVER_URL;
        fetchUrl = `${storageBase}${document.fileUrl}`;
      }
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        return apiError("Belge dosyasına erişilemedi.", 500, "FILE_FETCH_ERROR");
      }
      buffer = await response.arrayBuffer();
    }
    const parsed = await parseDocxBuffer(buffer);

    const html = parsed.paragraphs
      .map((para, idx) => paragraphToHtml(para, idx))
      .join("\n");

    return apiSuccess({
      html,
      paragraphCount: parsed.paragraphs.length,
      wordCount: parsed.wordCount,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("GET /api/documents/[id]/content error:", error);
    return apiError("Belge içeriği yüklenirken bir hata oluştu.", 500);
  }
}
