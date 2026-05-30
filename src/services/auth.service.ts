import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { hashPassword, comparePassword, generateToken, AppError } from "@/lib/utils";
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from "@/validators/auth.schema";
import { User, UserRole } from "@prisma/client";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface SafeUser {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
}

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export async function registerUser(input: RegisterInput): Promise<{
  user: SafeUser;
  tokens: AuthTokens;
}> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 422, "VALIDATION_ERROR");
  }

  const { email, password, name, surname } = parsed.data;

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new AppError(
      "Bu e-posta adresi zaten kayıtlı.",
      409,
      "EMAIL_EXISTS",
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name,
      surname: surname ?? null,
      credit: {
        create: {
          balance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        },
      },
    },
  });

  try {
    await prisma.creditTransaction.create({
      data: {
        userCreditId: user.id,
        amount: 3,
        type: "REGISTRATION",
        description: "Kayıt bonusu - 3 ücretsiz kredi",
      },
    });

    await prisma.userCredit.update({
      where: { userId: user.id },
      data: {
        balance: { increment: 3 },
        lifetimeEarned: { increment: 3 },
      },
    });
  } catch {
    // Bonus kredi verilemezse kaydı iptal etme
    void 0;
  }

  const tokens = await generateAndStoreTokens(user.id, user.email, user.role);

  return {
    user: toSafeUser(user),
    tokens,
  };
}

export async function loginUser(input: LoginInput): Promise<{
  user: SafeUser;
  tokens: AuthTokens;
}> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 422, "VALIDATION_ERROR");
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError(
      "E-posta veya şifre hatalı.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const passwordValid = await comparePassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new AppError(
      "E-posta veya şifre hatalı.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "Hesabınız devre dışı bırakılmış. Yönetici ile iletişime geçiniz.",
      403,
      "ACCOUNT_DISABLED",
    );
  }

  const tokens = await generateAndStoreTokens(user.id, user.email, user.role);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    user: toSafeUser(user),
    tokens,
  };
}

async function generateAndStoreTokens(
  userId: string,
  email: string,
  role: UserRole,
): Promise<AuthTokens> {
  const accessToken = await signAccessToken({
    sub: userId,
    email,
    role,
  });

  const jti = generateToken();

  const accessExpiresIn = parseDurationSeconds(
    process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  );

  const refreshExpiresInStr = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  const refreshToken = await signRefreshToken({
    sub: userId,
    jti,
  });

  const refreshExpiresAt = new Date(
    Date.now() + parseDurationMs(refreshExpiresInStr),
  );

  await prisma.refreshToken.create({
    data: {
      userId,
      token: jti,
      expiresAt: refreshExpiresAt,
    },
  });

  await cleanExpiredRefreshTokens(userId);

  return {
    accessToken,
    refreshToken,
    expiresIn: accessExpiresIn,
  };
}

async function cleanExpiredRefreshTokens(userId: string): Promise<void> {
  const tokens = await prisma.refreshToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const limit = 5;
  if (tokens.length > limit) {
    const toDelete = tokens.slice(limit);
    await prisma.refreshToken.deleteMany({
      where: { id: { in: toDelete.map((t) => t.id) } },
    });
  }
}

export async function refreshAuth(
  rawRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  let payload: { sub: string; jti: string };
  try {
    payload = await verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError("Geçersiz veya süresi dolmuş oturum.", 401, "INVALID_REFRESH_TOKEN");
  }

  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      token: payload.jti,
      userId: payload.sub,
      expiresAt: { gt: new Date() },
    },
  });

  if (!storedToken) {
    throw new AppError("Oturum bulunamadı. Tekrar giriş yapın.", 401, "REFRESH_TOKEN_NOT_FOUND");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || !user.isActive) {
    throw new AppError("Hesap devre dışı.", 403, "ACCOUNT_DISABLED");
  }

  // Eski refresh token'ı sil, yenisini oluştur (rotation)
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const newJti = generateToken();
  const refreshExpiresInStr = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  const newRefreshToken = await signRefreshToken({
    sub: user.id,
    jti: newJti,
  });

  const refreshExpiresAt = new Date(
    Date.now() + parseDurationMs(refreshExpiresInStr),
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newJti,
      expiresAt: refreshExpiresAt,
    },
  });

  await cleanExpiredRefreshTokens(user.id);

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const expiresIn = parseDurationSeconds(
    process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn,
  };
}

export async function logoutUser(
  rawRefreshToken: string | null,
): Promise<void> {
  if (!rawRefreshToken) return;

  try {
    const payload = await verifyRefreshToken(rawRefreshToken);
    await prisma.refreshToken.deleteMany({
      where: { token: payload.jti, userId: payload.sub },
    });
  } catch {
    // Token geçersiz olsa bile çıkış yapılsın
  }
}

function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

function parseDurationSeconds(duration: string): number {
  return Math.floor(parseDurationMs(duration) / 1000);
}
