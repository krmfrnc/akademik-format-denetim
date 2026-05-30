import { verifyAccessToken, type AccessTokenPayload } from "./jwt";

function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const cookieToken = cookies["access_token"];
    if (cookieToken) return cookieToken;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx > 0) {
      result[pair.substring(0, eqIdx).trim()] =
        decodeURIComponent(pair.substring(eqIdx + 1).trim());
    }
  }
  return result;
}

export async function getAuthUser(
  request: Request,
): Promise<AccessTokenPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: Request,
): Promise<AccessTokenPayload> {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
