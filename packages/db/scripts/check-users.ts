/**
 * List users in the DB and optionally fix superadmin.
 * Run from repo root with Neon DATABASE_URL:
 *   cd packages/db && pnpm exec tsx scripts/check-users.ts
 * Or: DATABASE_URL="postgresql://..." pnpm exec tsx packages/db/scripts/check-users.ts
 *
 * Fix superadmin (set simon@visionbuildingtechs.com as superadmin and set password):
 *   FIX_SUPERADMIN=1 NEW_PASSWORD='<your-new-password>' pnpm exec tsx packages/db/scripts/check-users.ts
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL = "simon@visionbuildingtechs.com";

async function main() {
  const fixSuperadmin = process.env.FIX_SUPERADMIN === "1" || process.env.FIX_SUPERADMIN === "true";
  const newPassword = process.env.NEW_PASSWORD;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
      isPlatformSuperadmin: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n=== Usuarios en la base de datos ===\n");
  if (users.length === 0) {
    console.log("No hay usuarios. Ejecuta el seed: cd packages/db && pnpm run seed");
    return;
  }

  for (const u of users) {
    const superLabel = u.isPlatformSuperadmin ? " [SUPERADMIN]" : "";
    const activeLabel = u.isActive ? "" : " [INACTIVO]";
    console.log(`  ${u.email}  |  ${u.fullName}  |  active=${u.isActive}  |  superadmin=${u.isPlatformSuperadmin}${superLabel}${activeLabel}`);
  }

  const simon = users.find((u) => u.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase());
  if (!simon) {
    console.log(`\n⚠ No existe usuario con email ${SUPERADMIN_EMAIL}.`);
    if (fixSuperadmin && newPassword) {
      console.log("Creando superadmin...");
      const hash = await bcrypt.hash(newPassword, 12);
      const org = await prisma.organization.findFirst({ where: { name: "Vision Latam" } });
      const created = await prisma.user.create({
        data: {
          fullName: "Platform Superadmin",
          email: SUPERADMIN_EMAIL,
          passwordHash: hash,
          isActive: true,
          isPlatformSuperadmin: true,
        },
      });
      if (org) {
        await prisma.orgMember.upsert({
          where: {
            organizationId_userId: { organizationId: org.id, userId: created.id },
          },
          update: { role: "org_admin", status: "active" },
          create: {
            organizationId: org.id,
            userId: created.id,
            role: "org_admin",
            status: "active",
            joinedAt: new Date(),
          },
        });
      }
      console.log("✅ Superadmin creado:", created.email);
    } else {
      console.log("Para crearlo: FIX_SUPERADMIN=1 NEW_PASSWORD=TuClave pnpm exec tsx packages/db/scripts/check-users.ts");
      console.log("O ejecuta el seed: SUPERADMIN_EMAIL=simon@visionbuildingtechs.com SUPERADMIN_PASSWORD=TuClave pnpm run seed");
    }
    return;
  }

  if (fixSuperadmin) {
    const updates: { isActive?: boolean; isPlatformSuperadmin?: boolean; passwordHash?: string } = {
      isActive: true,
      isPlatformSuperadmin: true,
    };
    if (newPassword && newPassword.length >= 8) {
      updates.passwordHash = await bcrypt.hash(newPassword, 12);
    }
    await prisma.user.update({
      where: { id: simon.id },
      data: updates,
    });
    console.log("\n✅ Superadmin actualizado:", simon.email, newPassword ? "(contraseña cambiada)" : "(solo flags)");
    return;
  }

  if (!simon.isActive || !simon.isPlatformSuperadmin) {
    console.log(`\n⚠ ${SUPERADMIN_EMAIL} existe pero no está activo o no es superadmin.`);
    console.log("Para corregir: FIX_SUPERADMIN=1 NEW_PASSWORD=TuClave pnpm exec tsx packages/db/scripts/check-users.ts");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
