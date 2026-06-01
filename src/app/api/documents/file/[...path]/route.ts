import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const filePath = params.path.join("/");

    const storageConfig = await prisma.systemConfig.findUnique({
      where: { key: "storage.local_path" },
    });
    const storagePath = (storageConfig?.value as string) ?? "/uploads/documents";
    const absolutePath = `${process.cwd()}/${storagePath}/${filePath}`;

    const fs = await import("fs/promises");

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(absolutePath);
    } catch {
      return apiError("Dosya bulunamadı.", 404, "FILE_NOT_FOUND");
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/documents/file/[...path] error:", error);
    return apiError("Dosya sunulurken bir hata oluştu.", 500);
  }
}
