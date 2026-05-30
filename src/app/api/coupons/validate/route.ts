import { NextRequest } from "next/server";
import { validateCoupon } from "@/services/coupon.service";
import { getAuthUser } from "@/lib/get-auth-user";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Oturum açmanız gerekiyor.", 401, "UNAUTHORIZED");
    }

    const body = await request.json();

    const result = await validateCoupon(body, user.sub);

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }

    console.error("POST /api/coupons/validate error:", error);
    return apiError("Sunucu hatası oluştu.", 500, "INTERNAL_ERROR");
  }
}
