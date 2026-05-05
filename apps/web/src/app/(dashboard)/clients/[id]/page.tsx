import { requireAuth } from "@/lib/utils";
import { getEffectiveActiveOrgId, getEffectiveOrganizationId } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientDetailActions } from "./ClientDetailActions";
import type { SessionUser } from "@/lib/auth";
import { getPartnerCountryDropdownOptions } from "@/lib/allowed-countries";
import { getCountryName } from "@/lib/countries";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    const user = await requireAuth();
    const effectiveOrgId = await getEffectiveActiveOrgId(user as SessionUser);
    const orgId = effectiveOrgId ?? getEffectiveOrganizationId(user) ?? "";
    if (!orgId) notFound();

    const [client, countries] = await Promise.all([
      prisma.client.findFirst({
        where: { id: params.id, organizationId: orgId },
        include: {
          projects: {
            select: { id: true, projectName: true, status: true },
            orderBy: { updatedAt: "desc" },
          },
        },
      }),
      getPartnerCountryDropdownOptions(prisma, orgId),
    ]);

    if (!client) notFound();

    const countryName =
      client.countryCode &&
      (countries.find((r) => r.code === client.countryCode)?.name ??
        getCountryName(client.countryCode));

    return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            {client.clientType && (
              <p className="text-sm text-muted-foreground">{client.clientType}</p>
            )}
          </div>
        </div>
        <ClientDetailActions client={client} countries={countries} />
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-5">
        <h2 className="mb-4 font-semibold text-foreground">Client details</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {client.legalName && (
            <>
              <dt className="text-muted-foreground">Legal name</dt>
              <dd className="text-foreground">{client.legalName}</dd>
            </>
          )}
          {client.taxId && (
            <>
              <dt className="text-muted-foreground">Tax ID</dt>
              <dd className="text-foreground">{client.taxId}</dd>
            </>
          )}
          {client.countryCode && (
            <>
              <dt className="text-muted-foreground">Country</dt>
              <dd className="text-foreground">{countryName ?? client.countryCode}</dd>
            </>
          )}
          {client.address && (
            <>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="text-foreground">{client.address}</dd>
            </>
          )}
          {client.city && (
            <>
              <dt className="text-muted-foreground">City</dt>
              <dd className="text-foreground">{client.city}</dd>
            </>
          )}
          {client.phone && (
            <>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="text-foreground">{client.phone}</dd>
            </>
          )}
          {client.email && (
            <>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">
                <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                  {client.email}
                </a>
              </dd>
            </>
          )}
          {client.website && (
            <>
              <dt className="text-muted-foreground">Website</dt>
              <dd className="text-foreground">
                <a
                  href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {client.website}
                </a>
              </dd>
            </>
          )}
          {client.notes && (
            <>
              <dt className="text-muted-foreground sm:col-span-1">Notes</dt>
              <dd className="text-foreground sm:col-span-2">{client.notes}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-5">
        <h2 className="mb-4 font-semibold text-foreground">
          Projects ({client.projects.length})
        </h2>
        {client.projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects linked to this client.</p>
        ) : (
          <ul className="space-y-2">
            {client.projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {(p as { projectName: string }).projectName}
                </Link>
                {p.status && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({p.status})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
  } catch (e) {
    if ((e as Error)?.message === "NEXT_REDIRECT") throw e;
    notFound();
  }
}
