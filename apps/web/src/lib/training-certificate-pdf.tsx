import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, pdf } from "@react-pdf/renderer";
import { CERTIFICATE_AUTHORIZED_BY, CERTIFICATE_ISSUED_BY } from "@/lib/certificate-signers";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1d1d1f",
    backgroundColor: "#f5f5f7",
    flexDirection: "column",
  },
  pageBody: {
    flexGrow: 1,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#d2d2d7",
    paddingBottom: 14,
    marginBottom: 18,
  },
  brandBlock: { flexDirection: "row", alignItems: "center" },
  logo: { width: 56, height: 64, objectFit: "contain" },
  logoPlaceholder: { width: 56, height: 64, borderWidth: 1, borderColor: "#d2d2d7" },
  brandText: { marginLeft: 10, maxWidth: 200 },
  brandSmall: { fontSize: 7, letterSpacing: 0.8, textTransform: "uppercase", color: "#6e6e73" },
  brandName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },
  titleBlock: { alignItems: "flex-end", flex: 1 },
  docTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.2,
    color: "#1d1d1f",
    textAlign: "right",
  },
  docSub: {
    fontSize: 7,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#6e6e73",
    marginTop: 4,
    textAlign: "right",
  },
  recipientLabel: {
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#6e6e73",
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#0071e3",
    maxWidth: "85%",
  },
  statement: { fontSize: 10, color: "#1d1d1f", marginBottom: 6, lineHeight: 1.35 },
  statement2: { fontSize: 9, color: "#6e6e73", marginBottom: 12, lineHeight: 1.35 },
  grid: {
    borderWidth: 1,
    borderColor: "#d2d2d7",
    marginBottom: 14,
    backgroundColor: "#ffffff",
  },
  gridRow: { flexDirection: "row" },
  cell: {
    width: "50%",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d2d2d7",
    padding: 10,
    minHeight: 44,
  },
  cellTopRight: { borderRightWidth: 0 },
  cellBottomLeft: { borderBottomWidth: 0 },
  cellBottomRight: { borderRightWidth: 0, borderBottomWidth: 0 },
  cellLabel: {
    fontSize: 6.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#6e6e73",
    marginBottom: 3,
  },
  cellValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1d1d1f" },
  cellValueMono: { fontSize: 10, fontFamily: "Helvetica", color: "#1d1d1f" },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#d2d2d7",
    paddingTop: 12,
  },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sigCol: { width: "38%" },
  sigLine: { borderBottomWidth: 1, borderBottomColor: "#1d1d1f", height: 22, marginBottom: 4 },
  sigName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1d1d1f", marginBottom: 2 },
  sigTitle: { fontSize: 8, color: "#6e6e73", marginBottom: 4 },
  sigLabel: { fontSize: 7, letterSpacing: 0.6, textTransform: "uppercase", color: "#6e6e73" },
  legal: { fontSize: 7, letterSpacing: 0.6, textTransform: "uppercase", color: "#6e6e73", textAlign: "center", marginBottom: 6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  certCodes: { fontSize: 7, fontFamily: "Helvetica", color: "#6e6e73", maxWidth: "70%" },
  qr: { width: 64, height: 64 },
});

export type TrainingCertificatePdfInput = {
  participantName: string;
  organizationName: string;
  programTitle: string;
  scoreLabel: string;
  issuedAtLabel: string;
  statementPrimary: string;
  statementSecondary: string | null;
  verifyPublicCode: string;
  internalId: string;
  verifyUrl: string;
  logoDataUrl: string | null;
  qrDataUrl: string | null;
};

function CertificateDoc(props: TrainingCertificatePdfInput) {
  const { statementSecondary } = props;
  return (
    <Document>
      <Page wrap={false} size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.pageBody}>
          <View style={styles.header}>
            <View style={styles.brandBlock}>
              {props.logoDataUrl ? (
                <Image src={props.logoDataUrl} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder} />
              )}
              <View style={styles.brandText}>
                <Text style={styles.brandSmall}>Vision Building Technologies</Text>
                <Text style={styles.brandName}>VBT</Text>
              </View>
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.docTitle}>CERTIFICADO DE FINALIZACIÓN</Text>
              <Text style={styles.docSub}>Registro técnico de capacitación</Text>
            </View>
          </View>

          <Text style={styles.recipientLabel}>Destinatario</Text>
          <Text style={styles.recipientName}>{props.participantName}</Text>
          <Text style={styles.statement}>{props.statementPrimary}</Text>
          {statementSecondary ? <Text style={styles.statement2}>{statementSecondary}</Text> : null}

          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Programa / Evaluación</Text>
                <Text style={styles.cellValue}>{props.programTitle}</Text>
              </View>
              <View style={[styles.cell, styles.cellTopRight]}>
                <Text style={styles.cellLabel}>Puntuación</Text>
                <Text style={styles.cellValueMono}>{props.scoreLabel}</Text>
              </View>
            </View>
            <View style={styles.gridRow}>
              <View style={[styles.cell, styles.cellBottomLeft]}>
                <Text style={styles.cellLabel}>Fecha de emisión</Text>
                <Text style={styles.cellValueMono}>{props.issuedAtLabel}</Text>
              </View>
              <View style={[styles.cell, styles.cellBottomRight]}>
                <Text style={styles.cellLabel}>Organización</Text>
                <Text style={styles.cellValue}>{props.organizationName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.sigRow}>
              <View style={styles.sigCol}>
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>{CERTIFICATE_ISSUED_BY.name}</Text>
                <Text style={styles.sigTitle}>{CERTIFICATE_ISSUED_BY.title}</Text>
                <Text style={styles.sigLabel}>Emitido por</Text>
              </View>
              <View style={styles.sigCol}>
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>{CERTIFICATE_AUTHORIZED_BY.name}</Text>
                <Text style={styles.sigTitle}>{CERTIFICATE_AUTHORIZED_BY.title}</Text>
                <Text style={styles.sigLabel}>Autorizado por</Text>
              </View>
            </View>
            <Text style={styles.legal}>Vision Building Technologies</Text>
            <View style={styles.metaRow}>
              <Text style={styles.certCodes}>
                Código de verificación: {props.verifyPublicCode}
                {"\n"}
                ID de registro (interno): {props.internalId}
              </Text>
              {props.qrDataUrl ? <Image src={props.qrDataUrl} style={styles.qr} /> : null}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function nodeStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function renderTrainingCertificatePdfBuffer(input: TrainingCertificatePdfInput): Promise<Buffer> {
  const instance = pdf(<CertificateDoc {...input} />);
  const stream = (await instance.toBuffer()) as unknown as NodeJS.ReadableStream;
  return nodeStreamToBuffer(stream);
}
