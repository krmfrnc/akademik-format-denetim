import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError, AppError } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 1));
    const isActive = searchParams.get("isActive");

    const where: Prisma.CouponWhereInput = {};
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          plans: {
            include: { plan: { select: { id: true, name: true } } },
          },
          packages: {
            include: { package: { select: { id: true, name: true } } },
          },
          _count: { select: { usages: true } },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    return apiSuccess({
      data: coupons,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("GET /api/coupons error:", error);
    return apiError("Kuponlar listelenirken bir hata oluştu.", 500);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const body = await request.json();

    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      appliesTo,
      targetType,
      targetUserIds,
      targetDomains,
      maxTotalUses,
      maxUsesPerUser,
      minCartAmount,
      startsAt,
      expiresAt,
      planIds,
      packageIds,
    } = body;

    if (!code || typeof code !== "string" || code.trim().length < 3) {
      return apiError("Kupon kodu en az 3 karakter olmalıdır.", 400, "INVALID_CODE");
    }

    if (!discountType || !["PERCENTAGE", "FIXED_AMOUNT", "FREE"].includes(discountType)) {
      return apiError("Geçerli bir indirim türü seçiniz.", 400, "INVALID_DISCOUNT_TYPE");
    }

    if (!targetType || !["ALL_USERS", "SPECIFIC_USERS", "EMAIL_DOMAIN", "NEW_USERS_ONLY"].includes(targetType)) {
      return apiError("Geçerli bir hedef kitle seçiniz.", 400, "INVALID_TARGET_TYPE");
    }

    const existing = await prisma.coupon.findFirst({
      where: { code: { equals: code.trim(), mode: "insensitive" } },
    });

    if (existing) {
      return apiError("Bu kupon kodu zaten kullanılıyor.", 409, "CODE_EXISTS");
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        description: description ?? null,
        discountType,
        discountValue:
          discountType === "FREE" ? null : discountValue ?? 0,
        maxDiscount:
          discountType === "PERCENTAGE" ? (maxDiscount ?? null) : null,
        appliesTo: appliesTo ?? ["SUBSCRIPTION", "CREDIT_PACKAGE"],
        targetType,
        targetUserIds: targetUserIds ?? [],
        targetDomains:
          targetType === "EMAIL_DOMAIN"
            ? (targetDomains ?? []).map((d: string) => d.trim().toLowerCase())
            : [],
        maxTotalUses: maxTotalUses ?? null,
        maxUsesPerUser: maxUsesPerUser ?? 1,
        minCartAmount: minCartAmount ?? null,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        createdBy: user.sub,
      },
    });

    if (planIds && Array.isArray(planIds) && planIds.length > 0) {
      await prisma.couponPlan.createMany({
        data: planIds.map((planId: string) => ({
          couponId: coupon.id,
          planId,
        })),
      });
    }

    if (packageIds && Array.isArray(packageIds) && packageIds.length > 0) {
      await prisma.couponPackage.createMany({
        data: packageIds.map((packageId: string) => ({
          couponId: coupon.id,
          packageId,
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: "coupon.created",
        entity: "Coupon",
        entityId: coupon.id,
        changes: { code: coupon.code, discountType },
      },
    });

    return apiSuccess(coupon, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode, error.code);
    }
    console.error("POST /api/coupons error:", error);
    return apiError("Kupon oluşturulurken bir hata oluştu.", 500);
  }
}
