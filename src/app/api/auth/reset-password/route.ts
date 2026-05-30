import { NextRequest } from "next/server";
import { resetPassword } from "@/services/auth.service";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return apiError(
        "Token ve yeni şifre gereklidir.",
        400,
        "MISSING_FIELDS",
      );
    }

    const success = await resetPassword(token, password);

    if (!success) {
      return apiError(
        "Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı.",
        400,
        "INVALID_TOKEN",
      );
    }

    return apiSuccess({
      message: "Şifreniz başarıyla sıfırlandı. Tüm cihazlardan çıkış yapıldı.",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    return apiError("Şifre sıfırlanırken bir hata oluştu.", 500);
  }
}
