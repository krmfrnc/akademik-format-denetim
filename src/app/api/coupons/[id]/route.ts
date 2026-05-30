import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-auth-user";
import { apiSuccess, apiError } from "@/lib/utils";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return apiError("Yetkisiz erişim.", 403, "FORBIDDEN");
    }

    await prisma.coupon.delete({ where: { id: params.id } });

    return apiSuccess({ message: "Kupon silindi." });
  } catch {
    return apiError("Kupon silinirken bir hata oluştu.", 500);
  }
}
