import { verifyAccessToken, type AccessTokenPayload } from "./jwt";

export async function getAuthUser(
  request: Request,
): Promise<AccessTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
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
