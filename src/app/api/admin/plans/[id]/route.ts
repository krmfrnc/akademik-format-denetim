export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    const fields = [
      "name", "description", "interval", "price", "currency",
      "analysisLimit", "maxFileSizeMB", "concurrentLimit",
      "isActive", "sortOrder",
    ];

    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f];
    }

    if (body.features !== undefined) updateData.features = body.features;

    const plan = await prisma.subscriptionPlan.update({
      where: { id: params.id },
      data: updateData,
    });

    return apiSuccess(plan);
  } catch {
    return apiError("Plan güncellenirken bir hata oluştu.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const activeSubs = await prisma.userSubscription.count({
      where: { planId: params.id, status: "ACTIVE" },
    });

    if (activeSubs > 0) {
      return apiError(
        `Bu plana bağlı ${activeSubs} aktif abonelik var. Önce abonelikleri iptal edin.`,
        409,
        "ACTIVE_SUBSCRIPTIONS",
      );
    }

    await prisma.subscriptionPlan.delete({ where: { id: params.id } });

    return apiSuccess({ message: "Plan silindi." });
  } catch {
    return apiError("Plan silinirken bir hata oluştu.", 500);
  }
}
