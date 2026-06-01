import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 1));
    const status = searchParams.get("status") ?? undefined;

    const where: Record<string, unknown> = { userId: user.sub };
    if (status) {
      where.status = status;
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              summary: true,
              creditCost: true,
              completedAt: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return apiSuccess({
      data: documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        status: doc.status,
        pageCount: doc.pageCount,
        wordCount: doc.wordCount,
        citationCount: doc.citationCount,
        errorMessage: doc.errorMessage,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastAnalysis: doc.analyses[0] ?? null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("GET /api/documents error:", error);
    return apiError("Belgeler listelenirken bir hata oluştu.", 500);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("Dosya yüklenmedi.", 400, "MISSING_FILE");
    }

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

    if (extension !== ".docx" || (file.type && !validTypes.includes(file.type))) {
      return apiError(
        "Sadece .docx dosyaları kabul edilir.",
        400,
        "INVALID_FILE_TYPE",
      );
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { userId: user.sub },
      include: { plan: true },
    });

    const isSubscribed =
      subscription?.status === "ACTIVE" || subscription?.status === "TRIAL";

    const maxSizeMB = isSubscribed
      ? (subscription?.plan?.maxFileSizeMB ?? 50)
      : 10;

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      const planName = subscription?.plan?.name ? `"${subscription.plan.name}"` : "mevcut";
      return apiError(
        `Dosya boyutu ${planName} planınızın limitini aşıyor. Maksimum: ${maxSizeMB} MB (Seçilen: ${fileSizeMB.toFixed(1)} MB)`,
        400,
        "FILE_SIZE_LIMIT",
      );
    }

    // Sayfa sayısı sınırı kontrolü (parse gerektirir, burada dosya boyutundan yaklaşık tahmin)
    const fileSizeKB = file.size / 1024;
    const estimatedPages = Math.ceil(fileSizeKB / 30);
    const maxPages = isSubscribed ? 500 : 200;

    if (estimatedPages > maxPages) {
      return apiError(
        `Tahmini sayfa sayısı (~${estimatedPages}) plan limitini aşıyor. Maksimum: ${maxPages} sayfa. Dosyayı küçültün veya planınızı yükseltin.`,
        400,
        "PAGE_COUNT_LIMIT",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const storageConfig = await prisma.systemConfig.findUnique({
      where: { key: "storage.type" },
    });
    const storageType = (storageConfig?.value as string) ?? "local";
    const storagePath =
      ((await prisma.systemConfig.findUnique({
        where: { key: "storage.local_path" },
      }))?.value as string) ?? "/uploads/documents";

    let fileUrl: string;

    if (storageType === "vercel_blob") {
      const { put } = await import("@vercel/blob");
      const uniqueName = `${user.sub}/${crypto.randomUUID()}.docx`;
      const blob = await put(uniqueName, buffer, {
        access: "public",
        contentType: file.type || validTypes[0],
      });
      fileUrl = blob.url;
    } else if (storageType === "s3") {
      fileUrl = `https://storage.example.com/documents/${user.sub}/${file.name}`;
    } else {
      const fs = await import("fs/promises");
      const path = await import("path");
      const crypto = await import("crypto");

      const uploadDir = path.join(process.cwd(), storagePath, user.sub);
      await fs.mkdir(uploadDir, { recursive: true });

      const uniqueName = `${crypto.randomUUID()}.docx`;
      const filePath = path.join(uploadDir, uniqueName);

      await fs.writeFile(filePath, buffer);
      fileUrl = `/api/documents/file/${user.sub}/${uniqueName}`;
    }

    const document = await prisma.document.create({
      data: {
        userId: user.sub,
        fileName: file.name,
        originalName: file.name.replace(/\.docx$/i, ""),
        fileUrl,
        fileSize: file.size,
        mimeType: file.type || validTypes[0],
        status: "UPLOADED",
      },
    });

    return apiSuccess(
      {
        id: document.id,
        originalName: document.originalName,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        createdAt: document.createdAt,
      },
      201,
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("POST /api/documents error:", error);
    return apiError("Belge yüklenirken bir hata oluştu.", 500);
  }
}
