import { NextRequest, NextResponse } from "next/server";
import { logoutUser } from "@/services/auth.service";
import { AppError, apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    let refreshToken: string | null = null;

    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(
        /(?:^|;\s*)refresh_token=([^;]*)/,
      );
      if (match) refreshToken = decodeURIComponent(match[1]);
    }

    try {
      const body = await request.json();
      if (!refreshToken && typeof body.refreshToken === "string") {
        refreshToken = body.refreshToken;
      }
    } catch {
      // body olmayabilir
    }

    await logoutUser(refreshToken);

    const response = NextResponse.json({
      success: true,
      data: { message: "Başarıyla çıkış yapıldı." },
    });

    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }

    console.error("Logout error:", error);
    return apiError("Çıkış sırasında bir hata oluştu.", 500);
  }
}
