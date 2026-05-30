import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

    const [data, total] = await Promise.all([
      prisma.citationStyle.findMany({
        where: {
          OR: [
            { isSystem: true },
            { createdBy: user.sub },
            { isActive: true },
          ],
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          shortName: true,
          description: true,
          isSystem: true,
          icon: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.citationStyle.count(),
    ]);

    return apiSuccess({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    return apiError("Kaynakça stilleri listelenirken bir hata oluştu.", 500);
  }
}
