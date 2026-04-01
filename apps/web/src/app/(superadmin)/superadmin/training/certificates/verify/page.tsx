import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuperadminCertificateVerifyToolPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { isPlatformSuperadmin?: boolean } | undefined;
  if (!user?.isPlatformSuperadmin) redirect("/dashboard");

  const code = (searchParams.code ?? "").trim();
  const verifyHref = code ? `/certificados/verificar/${encodeURIComponent(code)}` : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Certificate Verify Tool</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa un codigo publico de verificacion para abrir la comprobacion publica del certificado.
        </p>
      </div>

      <form method="get" className="surface-card p-4 max-w-xl space-y-3">
        <label className="block text-xs text-muted-foreground">Codigo de verificacion</label>
        <input
          type="text"
          name="code"
          defaultValue={code}
          placeholder="Ej: f54444e7..."
          className="input-native w-full"
        />
        <button
          type="submit"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/50"
        >
          Abrir comprobacion
        </button>
      </form>

      {verifyHref ? (
        <div className="surface-card p-4 text-sm">
          <p className="text-muted-foreground mb-2">Accesos directos:</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={verifyHref}
              target="_blank"
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted/50"
            >
              Abrir verificacion publica
            </Link>
            <Link
              href="/superadmin/training/certificates"
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted/50"
            >
              Ir a lista de certificados
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

