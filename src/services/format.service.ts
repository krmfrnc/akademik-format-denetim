import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils";
import {
  createFormatSchema,
  updateFormatSchema,
  type CreateFormatInput,
  type UpdateFormatInput,
} from "@/validators/format.schema";
import { FormatTemplate, Prisma } from "@prisma/client";

type FormatWithCreator = FormatTemplate & {
  creator: { id: string; name: string; email: string } | null;
};

interface FormatListFilters {
  page?: number;
  limit?: number;
  search?: string;
  isSystem?: boolean;
  createdBy?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function createFormat(
  input: CreateFormatInput,
  userId: string,
): Promise<FormatWithCreator> {
  const parsed = createFormatSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 422, "VALIDATION_ERROR");
  }

  const { name, description, isPublic, parentId, rules } = parsed.data;

  if (parentId) {
    const parent = await prisma.formatTemplate.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new AppError(
        "Referans alınan format şablonu bulunamadı.",
        404,
        "PARENT_NOT_FOUND",
      );
    }

    if (!parent.isSystem && !parent.isPublic && parent.createdBy !== userId) {
      throw new AppError(
        "Bu format şablonu üzerinden türetme yapamazsınız.",
        403,
        "FORBIDDEN",
      );
    }
  }

  const format = await prisma.formatTemplate.create({
    data: {
      name,
      description: description ?? null,
      isSystem: false,
      isPublic: isPublic ?? false,
      parentId: parentId ?? null,
      createdBy: userId,
      rules: rules as Prisma.InputJsonValue,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return format as FormatWithCreator;
}

export async function getFormats(
  filters: FormatListFilters = {},
): Promise<PaginatedResponse<FormatWithCreator>> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.FormatTemplateWhereInput = {};

  if (filters.isSystem !== undefined) {
    where.isSystem = filters.isSystem;
  }

  if (filters.createdBy) {
    where.createdBy = filters.createdBy;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.formatTemplate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.formatTemplate.count({ where }),
  ]);

  return {
    data: data as FormatWithCreator[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getFormatById(
  id: string,
): Promise<FormatWithCreator | null> {
  const format = await prisma.formatTemplate.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      parent: {
        select: { id: true, name: true },
      },
    },
  });

  return format as FormatWithCreator | null;
}

export async function updateFormat(
  id: string,
  input: UpdateFormatInput,
  userId: string,
  userRole: string,
): Promise<FormatWithCreator> {
  const parsed = updateFormatSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 422, "VALIDATION_ERROR");
  }

  const existing = await prisma.formatTemplate.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError("Format şablonu bulunamadı.", 404, "NOT_FOUND");
  }

  if (existing.isSystem && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new AppError(
      "Sistem şablonları sadece yöneticiler tarafından güncellenebilir.",
      403,
      "FORBIDDEN",
    );
  }

  if (existing.createdBy !== userId && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new AppError(
      "Sadece kendi oluşturduğunuz şablonları güncelleyebilirsiniz.",
      403,
      "FORBIDDEN",
    );
  }

  const updateData: Prisma.FormatTemplateUpdateInput = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.isPublic !== undefined) updateData.isPublic = parsed.data.isPublic;
  if (parsed.data.rules !== undefined) updateData.rules = parsed.data.rules as Prisma.InputJsonValue;
  updateData.version = { increment: 1 };

  const format = await prisma.formatTemplate.update({
    where: { id },
    data: updateData,
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return format as FormatWithCreator;
}

export async function deleteFormat(
  id: string,
  userId: string,
  userRole: string,
): Promise<void> {
  const existing = await prisma.formatTemplate.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError("Format şablonu bulunamadı.", 404, "NOT_FOUND");
  }

  if (existing.isSystem) {
    throw new AppError(
      "Sistem şablonları silinemez.",
      403,
      "FORBIDDEN",
    );
  }

  if (existing.createdBy !== userId && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new AppError(
      "Sadece kendi oluşturduğunuz şablonları silebilirsiniz.",
      403,
      "FORBIDDEN",
    );
  }

  await prisma.formatTemplate.delete({ where: { id } });
}
