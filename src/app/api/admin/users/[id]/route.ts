import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError } from "@/lib/utils";

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
        changes: updateData,
      },
    });

    return apiSuccess({ message: "Kullanıcı güncellendi." });
  } catch {
    return apiError("Kullanıcı güncellenirken bir hata oluştu.", 500);
  }
}
