import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function extractEmailDomain(email: string): string {
  const parts = email.split("@");
  return parts.length > 1 ? parts[1].toLowerCase() : "";
}

export function generateToken(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const values = new Uint32Array(32);
  crypto.getRandomValues(values);
  for (let i = 0; i < 32; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function apiSuccess<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function apiError(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
): Response {
  return new Response(
    JSON.stringify({ success: false, error: { message, code } }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}
