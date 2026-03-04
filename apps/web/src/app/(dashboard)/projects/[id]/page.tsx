import { requireAuth } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  await requireAuth();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      country: { select: { id: true, name: true, code: true } },
      quotes: {
        include: { country: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) notFound();

  const serialized = {
    ...project,
    plannedStartDate: project.plannedStartDate?.toISOString?.() ?? null,
  };

  return <ProjectDetailClient initialProject={serialized as any} />;
}
