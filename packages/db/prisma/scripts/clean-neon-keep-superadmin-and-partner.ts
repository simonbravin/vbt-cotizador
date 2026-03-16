/**
 * Clean Neon DB: keep only superadmin user and partner simon@visionbuildingtechs.com
 * (and their organizations + org_members). All other users, orgs, and tenant data are deleted.
 *
 * Prerequisites: run migrations first (pnpm exec prisma migrate deploy from packages/db).
 *
 * Run from repo root: pnpm --filter @vbt/db run clean-neon
 * Or from packages/db: pnpm run clean-neon (requires .env with DATABASE_URL)
 */
import { PrismaClient } from "../../../../apps/web/.prisma/client";

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? "admin@visionbuildingtechs.com";
const PARTNER_EMAIL = "simon@visionbuildingtechs.com";

async function main() {
  console.log("🔍 Finding users to keep:", SUPERADMIN_EMAIL, PARTNER_EMAIL);

  const superadmin = await prisma.user.findUnique({ where: { email: SUPERADMIN_EMAIL.toLowerCase() } });
  const partner = await prisma.user.findUnique({ where: { email: PARTNER_EMAIL.toLowerCase() } });

  if (!superadmin) {
    throw new Error(`Superadmin user not found: ${SUPERADMIN_EMAIL}. Run seed first.`);
  }
  if (!partner) {
    throw new Error(`Partner user not found: ${PARTNER_EMAIL}. Invite and accept first.`);
  }

  const keepUserIds = [superadmin.id, partner.id];

  const memberships = await prisma.orgMember.findMany({
    where: { userId: { in: keepUserIds } },
    select: { organizationId: true },
  });
  const keepOrgIds = [...new Set(memberships.map((m) => m.organizationId))];

  console.log("✅ Keep users:", keepUserIds);
  console.log("✅ Keep orgs:", keepOrgIds);
  if (keepOrgIds.length === 0) {
    throw new Error("No organizations found for these users.");
  }

  console.log("\n🗑️ Deleting tenant data not in keep orgs...");

  const usersToDeleteIds = await prisma.user.findMany({
    where: { id: { notIn: keepUserIds } },
    select: { id: true },
  }).then((u) => u.map((x) => x.id));
  if (usersToDeleteIds.length > 0) {
    try {
      await prisma.passwordResetToken.deleteMany({
        where: { userId: { in: usersToDeleteIds } },
      });
    } catch {
      // Table may not exist
    }
  }

  await prisma.$transaction(async (tx) => {
    // Order: child tables first, then parents. Use raw deletes where Prisma might not have relation.

    const deleteActivityLogs = tx.activityLog.deleteMany({
      where: { organizationId: { notIn: keepOrgIds } },
    });
    const deleteTrainingEnrollments = tx.trainingEnrollment.deleteMany({
      where: { organizationId: { notIn: keepOrgIds } },
    });
    const deleteWarehouses = tx.warehouse.deleteMany({
      where: { organizationId: { notIn: keepOrgIds } },
    });
    await Promise.all([deleteActivityLogs, deleteTrainingEnrollments, deleteWarehouses]);

    const quotesToDelete = await tx.quote.findMany({
      where: { organizationId: { notIn: keepOrgIds } },
      select: { id: true },
    });
    const quoteIds = quotesToDelete.map((q) => q.id);
    if (quoteIds.length > 0) {
      await tx.quoteItem.deleteMany({ where: { quoteId: { in: quoteIds } } });
      await tx.quote.deleteMany({ where: { id: { in: quoteIds } } });
    }

    const engRequests = await tx.engineeringRequest.findMany({
      where: { organizationId: { notIn: keepOrgIds } },
      select: { id: true },
    });
    const erIds = engRequests.map((e) => e.id);
    if (erIds.length > 0) {
      await tx.engineeringDeliverable.deleteMany({ where: { engineeringRequestId: { in: erIds } } });
      await tx.engineeringFile.deleteMany({ where: { engineeringRequestId: { in: erIds } } });
      await tx.engineeringRequest.deleteMany({ where: { id: { in: erIds } } });
    }

    const projectsToDelete = await tx.project.findMany({
      where: { organizationId: { notIn: keepOrgIds } },
      select: { id: true },
    });
    const projectIds = projectsToDelete.map((p) => p.id);
    if (projectIds.length > 0) {
      await tx.projectClaim.deleteMany({ where: { projectId: { in: projectIds } } });
      await tx.project.deleteMany({ where: { id: { in: projectIds } } });
    }

    await tx.client.deleteMany({
      where: { organizationId: { notIn: keepOrgIds } },
    });

    await tx.partnerProfile.deleteMany({
      where: { organizationId: { notIn: keepOrgIds } },
    });
    await tx.partnerTerritory.deleteMany({
      where: { organizationId: { notIn: keepOrgIds } },
    });
    await tx.partnerInvite.deleteMany({
      where: { organizationId: { notIn: keepOrgIds } },
    });
    await tx.orgMember.deleteMany({
      where: { organizationId: { notIn: keepOrgIds } },
    });
    await tx.orgMember.deleteMany({
      where: { userId: { notIn: keepUserIds } },
    });
    await tx.organization.deleteMany({
      where: { id: { notIn: keepOrgIds } },
    });

    await tx.user.deleteMany({
      where: { id: { notIn: keepUserIds } },
    });
  });

  console.log("✅ Cleanup complete. Only superadmin and partner (simon@visionbuildingtechs.com) and their orgs remain.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
