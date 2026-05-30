import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/services/auth.service";
import { AppError, apiError } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    const result = await registerUser(body);

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: result.user,
          tokens: {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
          },
        },
      },
      { status: 201 },
    );

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

    console.error("Register error:", error);
    return apiError("Sunucu hatası oluştu.", 500, "INTERNAL_ERROR");
  }
}
