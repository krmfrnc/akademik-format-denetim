export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const admin = await getAuthUser(request);
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const { role, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return apiError("Güncellenecek alan bulunamadı.", 400);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!targetUser) {
      return apiError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
    }

    if (params.id === admin.sub) {
      return apiError("Kendi hesabınızı buradan güncelleyemezsiniz.", 403, "SELF_UPDATE_FORBIDDEN");
    }

    await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.sub,
        action: "user.updated",
        entity: "User",
        entityId: params.id,
        changes: updateData as Prisma.InputJsonValue,
      },
    });

    return apiSuccess({ message: "Kullanıcı güncellendi." });
  } catch {
    return apiError("Kullanıcı güncellenirken bir hata oluştu.", 500);
  }
}
