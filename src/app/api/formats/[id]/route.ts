import { NextRequest } from "next/server";
import { getFormatById, updateFormat, deleteFormat } from "@/services/format.service";
import { getAuthUser } from "@/lib/get-auth-user";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const format = await getFormatById(params.id);
    if (!format) {
      return apiError("Format şablonu bulunamadı.", 404, "NOT_FOUND");
    }
    return apiSuccess(format);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    return apiError("Format bilgisi alınırken bir hata oluştu.", 500);
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
    const format = await updateFormat(params.id, body, user.sub, user.role);

    return apiSuccess(format);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("PUT /api/formats/[id] error:", error);
    return apiError("Format güncellenirken bir hata oluştu.", 500);
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

    await deleteFormat(params.id, user.sub, user.role);

    return apiSuccess({ message: "Format şablonu silindi." });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("DELETE /api/formats/[id] error:", error);
    return apiError("Format silinirken bir hata oluştu.", 500);
  }
}
