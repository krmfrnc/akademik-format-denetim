import { NextRequest } from "next/server";
import {
  getCitationStyleById,
  updateCitationStyle,
  deleteCitationStyle,
} from "@/services/citation.service";
import { getAuthUser } from "@/lib/get-auth-user";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const style = await getCitationStyleById(params.id);
    if (!style) {
      return apiError("Kaynakça stili bulunamadı.", 404, "NOT_FOUND");
    }
    return apiSuccess(style);
  } catch (error) {
    return apiError("Stil bilgisi alınırken bir hata oluştu.", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    const style = await updateCitationStyle(
      params.id,
      body,
      user.sub,
      user.role,
    );

    return apiSuccess(style);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("PUT /api/citations/[id] error:", error);
    return apiError("Stil güncellenirken bir hata oluştu.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    await deleteCitationStyle(params.id, user.sub, user.role);

    return apiSuccess({ message: "Kaynakça stili silindi." });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("DELETE /api/citations/[id] error:", error);
    return apiError("Stil silinirken bir hata oluştu.", 500);
  }
}
