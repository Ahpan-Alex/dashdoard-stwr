import { apiFetch, ApiError } from "./api";
import type { ActiviteEntite, Client } from "./types";

export type CanalEnvoiDocument = "email" | "whatsapp";

export type StatutEnvoiDocuments = {
  emailPret: boolean;
  whatsappPret: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFrom: string;
  whatsappPhoneNumberId: string;
  motDePasseSmtpRenseigne: boolean;
  jetonWhatsappRenseigne: boolean;
};

export function telephoneWhatsappClient(client?: Pick<Client, "telephone" | "contacts"> | null) {
  if (!client) return "";
  const viaContact = (client.contacts ?? [])
    .map((c) => c.reseaux?.whatsapp || c.telephone)
    .find((v) => v && v.trim());
  return (viaContact || client.telephone || "").trim();
}

export function messageDocumentDefaut(opts: {
  typeLibelle: string;
  numero: string;
  nomEntreprise?: string;
}) {
  const qui = opts.nomEntreprise?.trim() || "notre entreprise";
  return `Bonjour,\n\nVeuillez trouver ci-joint ${opts.typeLibelle} ${opts.numero}.\n\nCordialement,\n${qui}`;
}

export async function chargerStatutEnvoi(): Promise<StatutEnvoiDocuments> {
  return apiFetch<StatutEnvoiDocuments>("/business/envoi");
}

export async function enregistrerConfigEnvoi(
  data: Partial<{
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassword: string;
    smtpFrom: string;
    whatsappToken: string;
    whatsappPhoneNumberId: string;
  }>,
) {
  return apiFetch<StatutEnvoiDocuments>("/business/envoi", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function envoyerDocumentPdf(opts: {
  canal: CanalEnvoiDocument;
  destinataire: string;
  sujet?: string;
  message?: string;
  filename: string;
  pdf: Blob;
  typeDocument?: string;
  numero?: string;
}) {
  const pdfBase64 = await blobVersBase64(opts.pdf);
  try {
    await apiFetch<{ ok: true }>("/business/envoi", {
      method: "POST",
      body: JSON.stringify({
        canal: opts.canal,
        destinataire: opts.destinataire,
        sujet: opts.sujet,
        message: opts.message,
        filename: opts.filename,
        pdfBase64,
        typeDocument: opts.typeDocument,
        numero: opts.numero,
      }),
    });
    return { ok: true as const };
  } catch (err) {
    const reason =
      err instanceof ApiError ? err.message : "L'envoi a échoué.";
    return { ok: false as const, reason };
  }
}

function blobVersBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const i = text.indexOf(",");
      resolve(i >= 0 ? text.slice(i + 1) : text);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const TYPE_DOCUMENT_ENVOI: Record<string, string> = {
  devis: "le devis",
  commande: "la commande",
  bon_de_livraison: "le bon de livraison",
  facture: "la facture",
  relance: "la facture (relance)",
  achat: "la facture d'achat",
};

export type EntiteEnvoi = Extract<
  ActiviteEntite,
  "devis" | "commande" | "bon_de_livraison" | "facture" | "achat"
>;
