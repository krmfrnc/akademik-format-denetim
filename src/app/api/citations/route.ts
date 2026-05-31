import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCitationStyle } from "@/services/citation.service";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    const style = await createCitationStyle(body, user.sub);

    return apiSuccess(style, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }

    console.error("POST /api/citations error:", error);
    return apiError("Sunucu hatası oluştu.", 500, "INTERNAL_ERROR");
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 1));

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
      prisma.citationStyle.count({
        where: {
          OR: [
            { isSystem: true },
            { createdBy: user.sub },
            { isActive: true },
          ],
        },
      }),
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
