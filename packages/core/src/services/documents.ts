import type { PrismaClient, Document, DocumentCategory } from "@vbt/db";

/**
 * Document library: platform docs have organizationId null; partner docs have organizationId set.
 * When organizationId is passed (partner), list returns platform docs + that org's docs only.
 */
export type ListDocumentsOptions = {
  categoryId?: string;
  categoryCode?: string;
  visibility?: "public" | "partners_only" | "internal";
  /** Exclude these visibility values (e.g. hide `internal` for partners). */
  excludeVisibilities?: ("public" | "partners_only" | "internal")[];
  countryScope?: string; // e.g. "PA" or "*"
  projectId?: string;
  engineeringRequestId?: string;
  /** When set (partner), filter to platform docs (org null) + this org's docs. When omitted (superadmin), no org filter. */
  organizationId?: string | null;
  limit?: number;
  offset?: number;
};

export async function listDocumentCategories(
  prisma: PrismaClient
): Promise<DocumentCategory[]> {
  return prisma.documentCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function listDocuments(
  prisma: PrismaClient,
  options: ListDocumentsOptions = {}
): Promise<{ documents: Document[]; total: number }> {
  const and: Record<string, unknown>[] = [];
  const base: Record<string, unknown> = {};
  if (options.categoryId) base.categoryId = options.categoryId;
  if (options.categoryCode) {
    const cat = await prisma.documentCategory.findUnique({
      where: { code: options.categoryCode },
    });
    if (cat) base.categoryId = cat.id;
  }
  if (options.visibility) base.visibility = options.visibility;
  if (options.projectId) base.projectId = options.projectId;
  if (options.engineeringRequestId) base.engineeringRequestId = options.engineeringRequestId;
  and.push(base);
  if (options.organizationId !== undefined && options.organizationId !== null) {
    and.push({ OR: [{ organizationId: null }, { organizationId: options.organizationId }] });
  }
  if (options.countryScope) {
    and.push({
      OR: [
        { countryScope: options.countryScope },
        { countryScope: "*" },
        { countryScope: null },
      ],
    });
  }
  if (options.excludeVisibilities?.length) {
    and.push({ NOT: { visibility: { in: options.excludeVisibilities } } });
  }
  const where = and.length === 1 ? and[0] : { AND: and };
  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { category: { select: { id: true, name: true, code: true } } },
      orderBy: [{ categoryId: "asc" }, { title: "asc" }],
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
    }),
    prisma.document.count({ where }),
  ]);
  return { documents, total };
}

/** Tenant + role context for document library (foundation for partner scaling). */
export type DocumentVisibilityContext = {
  organizationId: string | null;
  /** Partner org default country / filter (ISO-2). */
  countryCode?: string | null;
  isPlatformSuperadmin: boolean;
  /** Reserved for future rules (e.g. technical_user). */
  role?: string | null;
};

/**
 * Single entry point for “what documents may this principal see”.
 * - Superadmin: all visibilities, optional org filter via `options.organizationId`.
 * - Partner: platform + org docs, never `internal`, optional country scope.
 */
export async function getVisibleDocuments(
  prisma: PrismaClient,
  ctx: DocumentVisibilityContext,
  options: Omit<ListDocumentsOptions, "organizationId" | "countryScope" | "excludeVisibilities"> & {
    countryScope?: string;
    organizationId?: string | null;
  } = {}
): Promise<{ documents: Document[]; total: number }> {
  if (!ctx.isPlatformSuperadmin && !ctx.organizationId) {
    return { documents: [], total: 0 };
  }

  const countryScope = options.countryScope ?? ctx.countryCode ?? undefined;
  const listOptions: ListDocumentsOptions = {
    ...options,
    countryScope,
  };

  if (ctx.isPlatformSuperadmin) {
    if (options.organizationId !== undefined) {
      listOptions.organizationId = options.organizationId;
    }
    return listDocuments(prisma, listOptions);
  }

  listOptions.organizationId = ctx.organizationId;
  listOptions.excludeVisibilities = ["internal"];
  return listDocuments(prisma, listOptions);
}

export async function getDocumentById(
  prisma: PrismaClient,
  documentId: string
): Promise<Document | null> {
  return prisma.document.findUnique({
    where: { id: documentId },
    include: { category: true },
  });
}

export type CreateDocumentInput = {
  title: string;
  description?: string | null;
  categoryId: string;
  fileUrl: string;
  visibility?: "public" | "partners_only" | "internal";
  countryScope?: string | null;
  documentType?: string | null;
  projectId?: string | null;
  engineeringRequestId?: string | null;
  organizationId?: string | null;
  createdByUserId?: string | null;
};

export async function createDocument(
  prisma: PrismaClient,
  input: CreateDocumentInput
): Promise<Document> {
  await prisma.documentCategory.findUniqueOrThrow({ where: { id: input.categoryId } });
  return prisma.document.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      categoryId: input.categoryId,
      fileUrl: input.fileUrl,
      visibility: input.visibility ?? "partners_only",
      countryScope: input.countryScope ?? null,
      documentType: input.documentType ?? null,
      projectId: input.projectId ?? null,
      engineeringRequestId: input.engineeringRequestId ?? null,
      organizationId: input.organizationId ?? null,
      createdByUserId: input.createdByUserId ?? null,
    },
    include: { category: { select: { id: true, name: true, code: true } } },
  });
}

export type UpdateDocumentInput = {
  title?: string;
  description?: string | null;
  categoryId?: string;
  fileUrl?: string;
  visibility?: "public" | "partners_only" | "internal";
  countryScope?: string | null;
};

export async function updateDocument(
  prisma: PrismaClient,
  documentId: string,
  data: UpdateDocumentInput
): Promise<Document> {
  return prisma.document.update({
    where: { id: documentId },
    data: {
      ...(data.title != null && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.categoryId != null && { categoryId: data.categoryId }),
      ...(data.fileUrl != null && { fileUrl: data.fileUrl }),
      ...(data.visibility != null && { visibility: data.visibility }),
      ...(data.countryScope !== undefined && { countryScope: data.countryScope }),
    },
    include: { category: { select: { id: true, name: true, code: true } } },
  });
}
