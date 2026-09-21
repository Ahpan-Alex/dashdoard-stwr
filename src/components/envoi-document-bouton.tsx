"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Send } from "lucide-react";
import Link from "next/link";
import { IconButton } from "@/components/icon-button";
import {
  feuilleDepuisConteneur,
  pdfBlobDepuisFeuille,
} from "@/lib/imprimer-document";
import {
  chargerStatutEnvoi,
  envoyerDocumentPdf,
  messageDocumentDefaut,
  telephoneWhatsappClient,
  TYPE_DOCUMENT_ENVOI,
  type CanalEnvoiDocument,
  type EntiteEnvoi,
  type StatutEnvoiDocuments,
} from "@/lib/envoi-document";
import { useStore } from "@/lib/store";
import type { Client } from "@/lib/types";

type Props = {
  filename: string;
  typeDocument: EntiteEnvoi | "relance";
  numero: string;
  entiteId: string;
  client?: Client;
  children: ReactNode;
  onEnvoye?: (canal: CanalEnvoiDocument) => void;
  variant?: "icon" | "button";
  boutonLabel?: string;
  sujetInitial?: string;
  messageInitial?: string;
  canalPrefere?: CanalEnvoiDocument;
};

export function EnvoiDocumentBouton({
  filename,
  typeDocument,
  numero,
  entiteId,
  client,
  children,
  onEnvoye,
  variant = "icon",
  boutonLabel,
  sujetInitial,
  messageInitial,
  canalPrefere,
}: Props) {
  const tracerEnvoiDocument = useStore((s) => s.tracerEnvoiDocument);
  const nomEntreprise = useStore((s) => s.parametres.nomEntreprise);
  const hostRef = useRef<HTMLDivElement>(null);
  const [etape, setEtape] = useState<"idle" | "pdf" | "form">("idle");
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [statut, setStatut] = useState<StatutEnvoiDocuments | null>(null);
  const [canal, setCanal] = useState<CanalEnvoiDocument>(canalPrefere ?? "email");
  const [destinataire, setDestinataire] = useState(client?.email ?? "");
  const [sujet, setSujet] = useState(
    sujetInitial ??
      `${TYPE_DOCUMENT_ENVOI[typeDocument] ?? "Document"} ${numero}`,
  );
  const [message, setMessage] = useState(
    messageInitial ??
      messageDocumentDefaut({
        typeLibelle: TYPE_DOCUMENT_ENVOI[typeDocument] ?? "le document",
        numero,
        nomEntreprise,
      }),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (etape !== "pdf") return;
    let cancelled = false;
    const run = async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (cancelled) return;
      const sheet = feuilleDepuisConteneur(hostRef.current);
      if (!sheet) {
        alert("Impossible de préparer le PDF.");
        setEtape("idle");
        return;
      }
      try {
        const blob = await pdfBlobDepuisFeuille(sheet, { filename });
        const st = await chargerStatutEnvoi().catch(() => null);
        if (cancelled) return;
        setPdf(blob);
        setStatut(st);
        const preferePret =
          canalPrefere === "whatsapp"
            ? Boolean(st?.whatsappPret)
            : canalPrefere === "email"
              ? Boolean(st?.emailPret)
              : false;
        const choisi: CanalEnvoiDocument = preferePret
          ? canalPrefere!
          : st?.emailPret
            ? "email"
            : st?.whatsappPret
              ? "whatsapp"
              : "email";
        setCanal(choisi);
        setDestinataire(
          choisi === "email"
            ? client?.email || ""
            : telephoneWhatsappClient(client) || "",
        );
        setEtape("form");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Préparation PDF impossible.");
        setEtape("idle");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [etape, filename, client, canalPrefere]);

  async function envoyer() {
    if (!pdf) return;
    if (!destinataire.trim()) {
      alert(canal === "email" ? "Indiquez l'e-mail du destinataire." : "Indiquez le n° WhatsApp.");
      return;
    }
    setBusy(true);
    const res = await envoyerDocumentPdf({
      canal,
      destinataire: destinataire.trim(),
      sujet,
      message,
      filename,
      pdf,
      typeDocument,
      numero,
    });
    setBusy(false);
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    const entite = typeDocument === "relance" ? "facture" : typeDocument;
    tracerEnvoiDocument({
      entite,
      entiteId,
      libelle: numero,
      canal,
      destinataire: destinataire.trim(),
    });
    onEnvoye?.(canal);
    setEtape("idle");
    setPdf(null);
    alert("Document envoyé.");
  }

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={etape === "pdf"}
          onClick={() => setEtape("pdf")}
        >
          <Send className="h-4 w-4" />
          {etape === "pdf" ? "Préparation du PDF…" : boutonLabel ?? "Envoyer"}
        </button>
      ) : (
        <IconButton
          label="Envoyer"
          disabled={etape === "pdf"}
          onClick={() => setEtape("pdf")}
        >
          <Send className="h-4 w-4" />
        </IconButton>
      )}

      {etape === "pdf" && (
        <div ref={hostRef} className="document-export-host" aria-hidden>
          {children}
        </div>
      )}

      {etape === "form" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal
          aria-label="Envoyer le document"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-[var(--radius)] border border-line bg-card p-5 shadow-xl">
            <h2 className="font-display text-lg font-semibold">
              Envoyer {numero}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Le PDF joint est le même que l&apos;aperçu.
            </p>
            {statut && !statut.emailPret && !statut.whatsappPret && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Aucun canal n&apos;est encore branché.{" "}
                <Link href="/parametres/envoi" className="font-semibold underline">
                  Configurer l&apos;envoi
                </Link>
              </p>
            )}
            <label className="mt-4 block text-xs font-semibold text-muted">
              Canal
              <select
                className="select mt-1"
                value={canal}
                onChange={(e) => {
                  const next = e.target.value as CanalEnvoiDocument;
                  setCanal(next);
                  setDestinataire(
                    next === "email"
                      ? client?.email ?? ""
                      : telephoneWhatsappClient(client),
                  );
                }}
              >
                <option value="email" disabled={statut ? !statut.emailPret : false}>
                  E-mail{statut && !statut.emailPret ? " — non configuré" : ""}
                </option>
                <option value="whatsapp" disabled={statut ? !statut.whatsappPret : false}>
                  WhatsApp{statut && !statut.whatsappPret ? " — non configuré" : ""}
                </option>
              </select>
            </label>
            <label className="mt-3 block text-xs font-semibold text-muted">
              {canal === "email" ? "E-mail destinataire" : "N° WhatsApp"}
              <input
                className="input mt-1"
                value={destinataire}
                onChange={(e) => setDestinataire(e.target.value)}
                placeholder={canal === "email" ? "client@exemple.mg" : "032 00 000 00"}
              />
            </label>
            {canal === "email" && (
              <label className="mt-3 block text-xs font-semibold text-muted">
                Objet
                <input
                  className="input mt-1"
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                />
              </label>
            )}
            <label className="mt-3 block text-xs font-semibold text-muted">
              Message
              <textarea
                className="input mt-1"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || (statut ? !(canal === "email" ? statut.emailPret : statut.whatsappPret) : false)}
                onClick={() => void envoyer()}
              >
                {busy ? "Envoi…" : "Envoyer"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => {
                  setEtape("idle");
                  setPdf(null);
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
