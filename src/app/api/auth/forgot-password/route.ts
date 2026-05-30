import { NextRequest } from "next/server";
import { requestPasswordReset } from "@/services/auth.service";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return apiError("E-posta adresi gereklidir.", 400, "MISSING_EMAIL");
    }

    await requestPasswordReset(email);

    return apiSuccess({
      message:
        "E-posta adresiniz sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    return apiError("Şifre sıfırlama isteği sırasında bir hata oluştu.", 500);
  }
}
