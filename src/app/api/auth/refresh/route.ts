import { NextRequest, NextResponse } from "next/server";
import { refreshAuth } from "@/services/auth.service";
import { AppError, apiError } from "@/lib/utils";

function getCookieOrBody(
  request: NextRequest,
  body: Record<string, unknown> | null,
  cookieName: string,
  bodyKey: string,
): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${cookieName}=([^;]*)`),
    );
    if (match) return decodeURIComponent(match[1]);
  }
  if (body && typeof body[bodyKey] === "string") {
    return body[bodyKey] as string;
  }
  return null;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    let body: Record<string, unknown> | null = null;
    try {
      body = await request.json();
    } catch {
      // body olmayabilir
    }

    const refreshToken = getCookieOrBody(
      request,
      body,
      "refresh_token",
      "refreshToken",
    );

    if (!refreshToken) {
      return apiError("Refresh token bulunamadı.", 401, "MISSING_REFRESH_TOKEN");
    }

    const result = await refreshAuth(refreshToken);

    const response = NextResponse.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      },
    });

    response.cookies.set("access_token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: result.expiresIn,
    });

    response.cookies.set("refresh_token", result.refreshToken, {
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

    console.error("Refresh error:", error);
    return apiError("Oturum yenilenirken bir hata oluştu.", 500);
  }
}
