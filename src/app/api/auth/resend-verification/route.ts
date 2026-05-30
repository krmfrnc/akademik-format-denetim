import { NextRequest } from "next/server";
import { requestEmailVerification } from "@/services/auth.service";
import { getAuthUser } from "@/lib/get-auth-user";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const { token } = await requestEmailVerification(user.sub);

    return apiSuccess({
      message: "Doğrulama e-postası gönderildi.",
      token,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    return apiError("Doğrulama e-postası gönderilirken bir hata oluştu.", 500);
  }
}
