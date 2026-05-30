import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
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
