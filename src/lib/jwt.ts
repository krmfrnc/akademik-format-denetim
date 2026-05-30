import { SignJWT, jwtVerify, type JWTPayload } from "jose";

function getSecret(type: "access" | "refresh"): Uint8Array {
  const key = type === "access" ? "JWT_ACCESS_SECRET" : "JWT_REFRESH_SECRET";
  const secret = process.env[key];
  if (!secret) {
    throw new Error(`${key} ortam değişkeni tanımlanmamış.`);
  }
  return new TextEncoder().encode(secret);
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES_IN || "15m")
    .sign(getSecret("access"));
}

export async function signRefreshToken(
  payload: RefreshTokenPayload,
): Promise<string> {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setJti(payload.jti)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES_IN || "7d")
    .sign(getSecret("refresh"));
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret("access"));
  return {
    sub: payload.sub || "",
    email: (payload.email as string) || "",
    role: (payload.role as string) || "USER",
  };
}

export async function verifyRefreshToken(
  token: string,
): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret("refresh"));
  return {
    sub: payload.sub || "",
    jti: (payload.jti as string) || "",
  };
}
