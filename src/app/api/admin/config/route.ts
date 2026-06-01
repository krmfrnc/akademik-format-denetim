import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const configs = await prisma.systemConfig.findMany();

    const configMap: Record<string, unknown> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    return apiSuccess({
      configs: configMap,
      items: configs,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("GET /api/admin/config error:", error);
    return apiError("Ayarlar alınırken bir hata oluştu.", 500);
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const body = await request.json();

    if (!body || typeof body !== "object") {
      return apiError("Geçersiz istek gövdesi.", 400);
    }

    const updates: Array<{ key: string; value: unknown; description: string | null }> = [];

    for (const [key, value] of Object.entries(body)) {
      if (typeof key === "string" && key.length > 0) {
        updates.push({ key, value, description: null });
      }
    }

    if (updates.length === 0) {
      return apiError("Güncellenecek ayar bulunamadı.", 400);
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.systemConfig.upsert({
          where: { key: u.key },
          update: {
            value: u.value as Prisma.InputJsonValue,
            updatedBy: user.sub,
          },
          create: {
            key: u.key,
            value: u.value as Prisma.InputJsonValue,
            description: u.description,
            updatedBy: user.sub,
          },
        }),
      ),
    );

    await prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: "config.updated",
        entity: "SystemConfig",
        entityId: null,
        changes: { keys: updates.map((u) => u.key) },
      },
    });

    const updatedConfigs = await prisma.systemConfig.findMany();
    const configMap: Record<string, unknown> = {};
    for (const c of updatedConfigs) {
      configMap[c.key] = c.value;
    }

    return apiSuccess({
      message: "Ayarlar başarıyla güncellendi.",
      configs: configMap,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("PUT /api/admin/config error:", error);
    return apiError("Ayarlar güncellenirken bir hata oluştu.", 500);
  }
}
