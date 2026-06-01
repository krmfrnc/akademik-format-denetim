import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";
import { deleteDocument } from "@/services/document.service";
import { parseDocxBuffer } from "@/services/docx-analyzer";
import type { DocxParagraph, DocxRun, ParsedDocx } from "@/services/docx-analyzer/types";
import { classifyParagraphSection } from "@/services/docx-analyzer/docx-parser";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function runToHtml(run: DocxRun): string {
  const styles: string[] = [];
  if (run.fontFamily) styles.push(`font-family:${run.fontFamily}`);
  if (run.fontSize) styles.push(`font-size:${run.fontSize}pt`);
  const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
  const text = escapeHtml(run.text);
  if (!text.trim()) return text;
  let inner = text;
  if (run.bold) inner = `<strong>${inner}</strong>`;
  if (run.italic) inner = `<em>${inner}</em>`;
  if (run.underline) inner = `<u>${inner}</u>`;
  return styleAttr ? `<span${styleAttr}>${inner}</span>` : `<span>${inner}</span>`;
}

const ALIGN: Record<string, string> = { left: "left", right: "right", center: "center", both: "justify", justify: "justify" };

function paragraphToHtml(para: DocxParagraph): string {
  const section = classifyParagraphSection(para);
  const styles: string[] = [];
  if (para.alignment) styles.push(`text-align:${ALIGN[para.alignment] || para.alignment}`);
  if (para.lineSpacing) styles.push(`line-height:${para.lineSpacing}`);
  if (para.firstLineIndent) styles.push(`text-indent:${para.firstLineIndent / 20}pt`);
  const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
  const runsHtml = para.runs.length > 0 ? para.runs.map(runToHtml).join("") : escapeHtml(para.text);
  if (!runsHtml.trim()) return `<p data-para-index="${para.index}" data-section="${section}"${styleAttr}><br></p>`;
  return `<p data-para-index="${para.index}" data-section="${section}"${styleAttr}>${runsHtml}</p>`;
}

function parsedDocxToHtml(parsed: ParsedDocx): string {
  return parsed.paragraphs.map(paragraphToHtml).join("\n");
}

async function getDocumentHtml(fileUrl: string): Promise<string | null> {
  try {
    if (fileUrl.includes("blob.vercel-storage.com")) {
      const response = await fetch(fileUrl);
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      const parsed = await parseDocxBuffer(buffer);
      return parsedDocxToHtml(parsed);
    }
    if (fileUrl.startsWith("/api/documents/file/")) {
      const relativePath = fileUrl.replace("/api/documents/file/", "");
      const storageConfig = await prisma.systemConfig.findUnique({
        where: { key: "storage.local_path" },
      });
      const storagePath = (storageConfig?.value as string) ?? "/uploads/documents";
      const absolutePath = `${process.cwd()}/${storagePath}/${relativePath}`;
      const fs = await import("fs/promises");
      const buffer = await fs.readFile(absolutePath);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      const parsed = await parseDocxBuffer(ab);
      return parsedDocxToHtml(parsed);
    }
    return null;
  } catch {
    return null;
  }
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

    const { searchParams } = new URL(request.url);
    const includeHtml = searchParams.get("includeHtml") === "true";

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

    let html: string | null = null;
    if (includeHtml) {
      html = await getDocumentHtml(document.fileUrl);
    }

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
      html,
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
