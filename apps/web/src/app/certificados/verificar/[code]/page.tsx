import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verificación de certificado · VBT",
  robots: { index: false, follow: false },
};

export default async function VerificarCertificadoPage({ params }: { params: { code: string } }) {
  const code = params.code?.trim();
  if (!code || code.length < 16) notFound();

  const row = await prisma.trainingCertificate.findUnique({
    where: { verifyPublicCode: code },
    select: { type: true, titleSnapshot: true, issuedAt: true },
  });
  if (!row) notFound();

  const typeLabel = row.type === "quiz" ? "Cuestionario" : "Sesión en vivo";
  const fecha = row.issuedAt.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-lg mx-auto border border-border rounded-lg p-6 md:p-8 surface-card space-y-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Vision Building Technologies</p>
        <h1 className="text-xl font-semibold text-foreground">Certificado verificado</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Este código confirma que Vision Building Technologies registró un certificado con los siguientes datos
          en la plataforma. No se muestra el nombre del titular en esta página por privacidad; quien posee el PDF
          puede contrastar programa y fecha.
        </p>
        <dl className="text-sm space-y-3 border-t border-border/60 pt-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</dt>
            <dd className="font-medium text-foreground mt-0.5">{typeLabel}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Programa / evaluación</dt>
            <dd className="font-medium text-foreground mt-0.5">{row.titleSnapshot}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Fecha de emisión</dt>
            <dd className="font-medium text-foreground mt-0.5 font-mono text-xs">{fecha}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground pt-2">
          Para soporte interno, el administrador de la plataforma puede localizar el mismo registro en Superadmin →
          Capacitación → Certificados usando el código de verificación impreso en el PDF.
        </p>
        <Link href="/" className="inline-block text-sm font-medium text-primary hover:underline pt-2">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
