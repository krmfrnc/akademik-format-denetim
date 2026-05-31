import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils";
import { CitationStyle, Prisma } from "@prisma/client";

interface CitationStyleFilters {
  page?: number;
  limit?: number;
  search?: string;
  isSystem?: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listCitationStyles(
  filters: CitationStyleFilters = {},
): Promise<PaginatedResponse<CitationStyle>> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.CitationStyleWhereInput = {};

  if (filters.isSystem !== undefined) where.isSystem = filters.isSystem;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { shortName: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.citationStyle.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prisma.citationStyle.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function createCitationStyle(
  input: {
    name: string;
    shortName?: string;
    description?: string;
    rules?: unknown;
    icon?: string;
    parentId?: string;
  },
  userId: string,
): Promise<CitationStyle> {
  if (!input.name || input.name.trim().length === 0) {
    throw new AppError("Stil adı gereklidir.", 422, "VALIDATION_ERROR");
  }

  if (input.parentId) {
    const parent = await prisma.citationStyle.findUnique({
      where: { id: input.parentId },
    });

    if (!parent) {
      throw new AppError(
        "Referans alınan kaynakça stili bulunamadı.",
        404,
        "PARENT_NOT_FOUND",
      );
    }

    if (!parent.isSystem && parent.createdBy !== userId) {
      throw new AppError(
        "Bu kaynakça stili üzerinden türetme yapamazsınız.",
        403,
        "FORBIDDEN",
      );
    }
  }

  return prisma.citationStyle.create({
    data: {
      name: input.name.trim(),
      shortName: input.shortName?.trim() ?? null,
      description: input.description?.trim() ?? null,
      rules: (input.rules ?? {}) as Prisma.InputJsonValue,
      icon: input.icon?.trim() ?? null,
      parentId: input.parentId ?? null,
      createdBy: userId,
      isSystem: false,
    },
  });
}

export async function getCitationStyleById(
  id: string,
): Promise<CitationStyle | null> {
  return prisma.citationStyle.findUnique({ where: { id } });
}

export async function updateCitationStyle(
  id: string,
  data: {
    name?: string;
    shortName?: string;
    description?: string;
    rules?: unknown;
    icon?: string;
    isActive?: boolean;
  },
  userId: string,
  userRole: string,
): Promise<CitationStyle> {
  const existing = await prisma.citationStyle.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError("Kaynakça stili bulunamadı.", 404, "NOT_FOUND");
  }

  if (existing.isSystem && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new AppError("Sistem stilleri sadece yöneticiler tarafından güncellenebilir.", 403, "FORBIDDEN");
  }

  if (existing.createdBy !== userId && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new AppError("Sadece kendi oluşturduğunuz stilleri güncelleyebilirsiniz.", 403, "FORBIDDEN");
  }

  const updateData: Prisma.CitationStyleUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.shortName !== undefined) updateData.shortName = data.shortName;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.rules !== undefined) updateData.rules = data.rules as Prisma.InputJsonValue;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  updateData.version = { increment: 1 };

  return prisma.citationStyle.update({ where: { id }, data: updateData });
}

export async function deleteCitationStyle(
  id: string,
  userId: string,
  userRole: string,
): Promise<void> {
  const existing = await prisma.citationStyle.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError("Kaynakça stili bulunamadı.", 404, "NOT_FOUND");
  }

  if (existing.isSystem) {
    throw new AppError("Sistem stilleri silinemez.", 403, "FORBIDDEN");
  }

  if (existing.createdBy !== userId && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new AppError("Sadece kendi oluşturduğunuz stilleri silebilirsiniz.", 403, "FORBIDDEN");
  }

  await prisma.citationStyle.delete({ where: { id } });
}
