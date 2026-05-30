import { NextRequest } from "next/server";
import { createFormat, getFormats } from "@/services/format.service";
import { getAuthUser } from "@/lib/get-auth-user";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);

    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!, 10)
      : undefined;

    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;

    const search = searchParams.get("search") ?? undefined;
    const isSystemParam = searchParams.get("isSystem");
    const createdBy = searchParams.get("createdBy") ?? undefined;

    const isSystem = isSystemParam !== null
      ? isSystemParam === "true"
      : undefined;

    const result = await getFormats({
      page,
      limit,
      search,
      isSystem,
      createdBy,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }

    console.error("GET /api/formats error:", error);
    return apiError("Sunucu hatası oluştu.", 500, "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    const format = await createFormat(body, user.sub);

    return apiSuccess(format, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }

    console.error("POST /api/formats error:", error);
    return apiError("Sunucu hatası oluştu.", 500, "INTERNAL_ERROR");
  }
}
