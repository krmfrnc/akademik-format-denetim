import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/services/auth.service";
import { AppError, apiError } from "@/lib/utils";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest): Promise<Response> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = applyRateLimit(ip, "auth:login", 5);
  if (limited) return limited;
  try {
    const body = await request.json();

    const result = await loginUser(body);

    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn,
        },
      },
    });

    response.cookies.set("access_token", result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: result.tokens.expiresIn,
    });

    response.cookies.set("refresh_token", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }

    console.error("Login error:", error);
    return apiError("Sunucu hatası oluştu.", 500, "INTERNAL_ERROR");
  }
}
