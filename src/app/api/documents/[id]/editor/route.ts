import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";
import { signOnlyOfficeToken, buildOnlyOfficeConfig } from "@/lib/onlyoffice";

const ONLYOFFICE_SERVER = "https://docs.krmfrnc.online";

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
      select: { id: true, fileName: true, originalName: true, fileUrl: true },
    });

    if (!document) {
      return apiError("Belge bulunamadı.", 404, "NOT_FOUND");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { name: true, email: true },
    });

    const isVercelBlob = document.fileUrl.includes("blob.vercel-storage.com");
    const isCustomStorage = document.fileUrl.startsWith("/storage/");
    let docUrl = document.fileUrl;

    if (isVercelBlob) {
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      if (blobToken) {
        docUrl = document.fileUrl.includes("?")
          ? `${document.fileUrl}&token=${blobToken}`
          : `${document.fileUrl}?token=${blobToken}`;
      }
    } else if (isCustomStorage) {
      const storageBase = process.env.STORAGE_SERVER_URL;
      docUrl = `${storageBase}${document.fileUrl}`;
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/documents/${params.id}/callback`;

    const config = buildOnlyOfficeConfig(
      document.id,
      document.originalName,
      docUrl,
      callbackUrl,
      user.sub,
      dbUser?.name || dbUser?.email || "Kullanıcı",
    );

    const token = await signOnlyOfficeToken(config);

    return apiSuccess({
      token,
      onlyofficeUrl: `${ONLYOFFICE_SERVER}/apps/api/documents/sharedocument`,
      serverUrl: ONLYOFFICE_SERVER,
      documentUrl: docUrl,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("GET /api/documents/[id]/editor error:", error);
    return apiError("Editör yapılandırması alınırken bir hata oluştu.", 500);
  }
}