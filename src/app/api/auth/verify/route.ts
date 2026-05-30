import { NextRequest } from "next/server";
import { verifyEmail } from "@/services/auth.service";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return apiError("Doğrulama token'ı gereklidir.", 400, "MISSING_TOKEN");
    }

    const verified = await verifyEmail(token);

    if (!verified) {
      return apiError(
        "Geçersiz veya süresi dolmuş doğrulama bağlantısı.",
        400,
        "INVALID_TOKEN",
      );
    }

    return apiSuccess({ message: "E-posta adresiniz başarıyla doğrulandı." });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    return apiError("Doğrulama sırasında bir hata oluştu.", 500);
  }
}
