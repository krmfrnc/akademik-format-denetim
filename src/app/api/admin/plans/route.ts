import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    return apiSuccess({ data: plans });
  } catch {
    return apiError("Planlar listelenirken bir hata oluştu.", 500);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const { name, description, interval, price, features, analysisLimit, maxFileSizeMB, concurrentLimit } = body;

    if (!name || !interval || price === undefined) {
      return apiError("Ad, aralık ve fiyat zorunludur.", 400);
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description: description ?? null,
        interval,
        price,
        features: features ?? {},
        analysisLimit: analysisLimit ?? null,
        maxFileSizeMB: maxFileSizeMB ?? 50,
        concurrentLimit: concurrentLimit ?? 1,
        isActive: true,
        sortOrder: 0,
      },
    });

    return apiSuccess(plan, 201);
  } catch {
    return apiError("Plan oluşturulurken bir hata oluştu.", 500);
  }
}
