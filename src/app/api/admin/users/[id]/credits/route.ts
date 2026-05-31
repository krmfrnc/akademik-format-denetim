import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const grantCreditsSchema = z.object({
  amount: z.number().int().positive().max(1000000),
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const admin = await getAuthUser(request);
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const parsed = grantCreditsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Geçersiz istek. Miktar pozitif bir sayı olmalıdır.", 400);
    }

    const { amount, reason } = parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return apiError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
    }

    const credit = await prisma.userCredit.upsert({
      where: { userId: params.id },
      create: {
        userId: params.id,
        balance: amount,
        lifetimeEarned: amount,
        lifetimeSpent: 0,
      },
      update: {
        balance: { increment: amount },
        lifetimeEarned: { increment: amount },
      },
    });

    await prisma.creditTransaction.create({
      data: {
        userCreditId: credit.id,
        amount,
        type: "ADMIN_GIFT",
        description: reason || `${admin.email} tarafından kredi hediyesi`,
        referenceId: admin.sub,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.sub,
        action: "credits.granted",
        entity: "UserCredit",
        entityId: params.id,
        changes: {
          amount,
          reason: reason || null,
          targetEmail: targetUser.email,
        } as Prisma.InputJsonValue,
      },
    });

    return apiSuccess({
      message: `${amount} kredi başarıyla verildi.`,
      newBalance: credit.balance,
    });
  } catch {
    return apiError("Kredi verilirken bir hata oluştu.", 500);
  }
}
