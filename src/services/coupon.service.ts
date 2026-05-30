import { prisma } from "@/lib/prisma";
import { AppError, extractEmailDomain } from "@/lib/utils";
import { validateCouponSchema, type ValidateCouponInput } from "@/validators/coupon.schema";
import { Coupon, DiscountType, Prisma } from "@prisma/client";

interface CouponValidationResult {
  valid: boolean;
  coupon: {
    id: string;
    code: string;
    description: string | null;
    discountType: DiscountType;
    discountValue: number | null;
    maxDiscount: number | null;
  };
  discount: {
    type: DiscountType;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    formula: string;
  };
  message: string;
}

export async function validateCoupon(
  input: ValidateCouponInput,
  userId: string,
): Promise<CouponValidationResult> {
  const parsed = validateCouponSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 422, "VALIDATION_ERROR");
  }

  const { code, cartType, cartAmount, planId, packageId } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, createdAt: true },
  });

  if (!user) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
  }

  const normalizedCode = code.trim().toUpperCase();

  const coupon = await prisma.coupon.findFirst({
    where: {
      code: { equals: normalizedCode, mode: "insensitive" },
    },
    include: {
      plans: { select: { planId: true } },
      packages: { select: { packageId: true } },
      usages: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!coupon) {
    throw new AppError(
      "Geçersiz kupon kodu.",
      404,
      "COUPON_NOT_FOUND",
    );
  }

  // 1. Aktiflik kontrolü
  if (!coupon.isActive) {
    throw new AppError(
      "Bu kupon artık geçerli değil.",
      400,
      "COUPON_INACTIVE",
    );
  }

  // 2. Başlangıç tarihi kontrolü
  if (coupon.startsAt && new Date() < coupon.startsAt) {
    throw new AppError(
      "Bu kupon henüz kullanıma açılmadı.",
      400,
      "COUPON_NOT_STARTED",
    );
  }

  // 3. Son kullanma tarihi kontrolü
  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    throw new AppError(
      "Bu kuponun süresi dolmuş.",
      400,
      "COUPON_EXPIRED",
    );
  }

  // 4. Toplam kullanım limiti kontrolü
  if (
    coupon.maxTotalUses !== null &&
    coupon.currentTotalUses >= coupon.maxTotalUses
  ) {
    throw new AppError(
      "Bu kuponun kullanım limiti dolmuş.",
      400,
      "COUPON_LIMIT_REACHED",
    );
  }

  // 5. Kişi başı kullanım limiti kontrolü
  if (coupon.maxUsesPerUser !== null) {
    const userUsageCount = coupon.usages.length;
    if (userUsageCount >= coupon.maxUsesPerUser) {
      throw new AppError(
        "Bu kuponu daha önce kullandınız.",
        400,
        "COUPON_ALREADY_USED",
      );
    }
  }

  // 6. Hedef kitle kontrolü
  validateCouponTarget(coupon, user);

  // 7. Sepet tipi kontrolü
  if (!coupon.appliesTo.includes(cartType)) {
    const cartTypeLabel = cartType === "SUBSCRIPTION" ? "Abonelik" : "Kredi Paketi";
    throw new AppError(
      `Bu kupon ${cartTypeLabel} alımlarında geçerli değildir.`,
      400,
      "COUPON_WRONG_CART_TYPE",
    );
  }

  // 8. Minimum sepet tutarı kontrolü
  if (coupon.minCartAmount !== null) {
    const minAmount = Number(coupon.minCartAmount);
    if (cartAmount < minAmount) {
      throw new AppError(
        `Bu kupon için minimum sepet tutarı ${formatCurrency(minAmount)}.`,
        400,
        "COUPON_MIN_AMOUNT",
      );
    }
  }

  // 9. Plan/Paket ilişkilendirme kontrolü
  if (cartType === "SUBSCRIPTION" && planId && coupon.plans.length > 0) {
    const planMatch = coupon.plans.some((p) => p.planId === planId);
    if (!planMatch) {
      throw new AppError(
        "Bu kupon seçtiğiniz abonelik planı için geçerli değil.",
        400,
        "COUPON_WRONG_PLAN",
      );
    }
  }

  if (cartType === "CREDIT_PACKAGE" && packageId && coupon.packages.length > 0) {
    const packageMatch = coupon.packages.some((p) => p.packageId === packageId);
    if (!packageMatch) {
      throw new AppError(
        "Bu kupon seçtiğiniz kredi paketi için geçerli değil.",
        400,
        "COUPON_WRONG_PACKAGE",
      );
    }
  }

  // 10. İndirim hesaplama
  const discount = calculateDiscount(coupon, cartAmount);
  const message = buildDiscountMessage(coupon, discount);

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue ? Number(coupon.discountValue) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    },
    discount,
    message,
  };
}

function validateCouponTarget(
  coupon: Coupon & { usages?: { id: string }[] },
  user: { id: string; email: string; createdAt: Date },
): void {
  const targetType = coupon.targetType;

  switch (targetType) {
    case "ALL_USERS":
      return;

    case "SPECIFIC_USERS": {
      if (!coupon.targetUserIds.includes(user.id)) {
        throw new AppError(
          "Bu kupon hesabınız için geçerli değil.",
          403,
          "COUPON_NOT_FOR_YOU",
        );
      }
      return;
    }

    case "EMAIL_DOMAIN": {
      const userDomain = extractEmailDomain(user.email);
      if (!userDomain) {
        throw new AppError(
          "E-posta adresinizden domain bilgisi alınamadı.",
          400,
          "INVALID_EMAIL_DOMAIN",
        );
      }

      const domainMatch = coupon.targetDomains.some(
        (domain) => userDomain === domain.toLowerCase(),
      );

      if (!domainMatch) {
        throw new AppError(
          "Bu kupon e-posta adresinizin bağlı olduğu kurum için geçerli değil.",
          403,
          "COUPON_WRONG_DOMAIN",
        );
      }
      return;
    }

    case "NEW_USERS_ONLY": {
      const hoursSinceCreation =
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        throw new AppError(
          "Bu kupon sadece yeni kullanıcılar için geçerlidir.",
          403,
          "COUPON_NEW_USERS_ONLY",
        );
      }
      return;
    }

    default:
      throw new AppError(
        "Geçersiz kupon hedef tipi.",
        500,
        "INVALID_TARGET_TYPE",
      );
  }
}

function calculateDiscount(
  coupon: Coupon,
  cartAmount: number,
): {
  type: DiscountType;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  formula: string;
} {
  const discountValue = coupon.discountValue ? Number(coupon.discountValue) : 0;
  const maxDiscount = coupon.maxDiscount ? Number(coupon.maxDiscount) : null;

  let discountAmount = 0;
  let formula = "";

  switch (coupon.discountType) {
    case "PERCENTAGE": {
      discountAmount = Math.round((cartAmount * discountValue) / 100 * 100) / 100;
      formula = `%${discountValue} indirim`;

      if (maxDiscount !== null && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
        formula = `%${discountValue} indirim (max ${formatCurrency(maxDiscount)})`;
      }
      break;
    }

    case "FIXED_AMOUNT": {
      discountAmount = Math.min(discountValue, cartAmount);
      formula = `${formatCurrency(discountValue)} indirim`;
      break;
    }

    case "FREE": {
      discountAmount = cartAmount;
      formula = "Ücretsiz (%100)";
      break;
    }
  }

  discountAmount = Math.round(discountAmount * 100) / 100;
  const finalAmount = Math.max(0, Math.round((cartAmount - discountAmount) * 100) / 100);

  return {
    type: coupon.discountType,
    originalAmount: Math.round(cartAmount * 100) / 100,
    discountAmount,
    finalAmount,
    formula,
  };
}

function buildDiscountMessage(
  coupon: Coupon,
  discount: { formula: string; discountAmount: number },
): string {
  const value = coupon.discountValue ? Number(coupon.discountValue) : 0;

  switch (coupon.discountType) {
    case "PERCENTAGE":
      return `%${value} indirim uygulandı. ${formatCurrency(discount.discountAmount)} tasarruf ettiniz.`;
    case "FIXED_AMOUNT":
      return `${formatCurrency(discount.discountAmount)} tutarında indirim uygulandı.`;
    case "FREE":
      return "Tebrikler! Bu kupon ile ücretsiz kazandınız.";
    default:
      return "Kupon başarıyla uygulandı.";
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function getCouponByCode(
  code: string,
): Promise<(Coupon & { usages: { id: string }[] }) | null> {
  return prisma.coupon.findFirst({
    where: {
      code: { equals: code.trim().toUpperCase(), mode: "insensitive" },
    },
    include: {
      usages: {
        select: { id: true },
      },
    },
  });
}

export async function applyCouponUsage(
  couponId: string,
  userId: string,
  invoiceId?: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.couponUsage.create({
      data: {
        couponId,
        userId,
        invoiceId: invoiceId ?? null,
      },
    }),
    prisma.coupon.update({
      where: { id: couponId },
      data: {
        currentTotalUses: { increment: 1 },
      },
    }),
  ]);
}
