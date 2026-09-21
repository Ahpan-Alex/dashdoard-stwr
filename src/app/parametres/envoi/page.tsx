"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import {
  chargerStatutEnvoi,
  enregistrerConfigEnvoi,
  type StatutEnvoiDocuments,
} from "@/lib/envoi-document";

const STATUT_VIDE: StatutEnvoiDocuments = {
  emailPret: false,
  whatsappPret: false,
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpFrom: "",
  whatsappPhoneNumberId: "",
  motDePasseSmtpRenseigne: false,
  jetonWhatsappRenseigne: false,
};

export default function ParametresEnvoiPage() {
  return (
    <RequirePermission permission="parametres.gerer">
      <EnvoiContent />
    </RequirePermission>
  );
}

function EnvoiContent() {
  const [statut, setStatut] = useState<StatutEnvoiDocuments>(STATUT_VIDE);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    void chargerStatutEnvoi()
      .then((s) => {
        setStatut(s);
        setSmtpHost(s.smtpHost);
        setSmtpPort(String(s.smtpPort || 587));
        setSmtpSecure(s.smtpSecure);
        setSmtpUser(s.smtpUser);
        setSmtpFrom(s.smtpFrom);
        setWhatsappPhoneNumberId(s.whatsappPhoneNumberId);
      })
      .catch((err) =>
        setErreur(err instanceof Error ? err.message : "Impossible de lire la config."),
      );
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErreur(null);
    try {
      const s = await enregistrerConfigEnvoi({
        smtpHost,
        smtpPort: Number(smtpPort) || 587,
        smtpSecure,
        smtpUser,
        smtpFrom,
        smtpPassword: smtpPassword.trim() || undefined,
        whatsappPhoneNumberId,
        whatsappToken: whatsappToken.trim() || undefined,
      });
      setStatut(s);
      setSmtpPassword("");
      setWhatsappToken("");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Envoi des documents"
        description="E-mail et WhatsApp avec le PDF du devis, de la commande, du BL ou de la facture — y compris les relances d'impayés."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">E-mail</p>
          <p className="font-display text-lg font-semibold">
            {statut.emailPret ? "Prêt" : "Non configuré"}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">WhatsApp</p>
          <p className="font-display text-lg font-semibold">
            {statut.whatsappPret ? "Prêt" : "Non configuré"}
          </p>
        </div>
      </div>

      {erreur && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">{erreur}</p>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
        <section className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="font-display text-lg font-semibold">E-mail (SMTP)</h2>
          <p className="mt-1 text-xs text-muted">
            Serveur mail de l&apos;entreprise (OVH, Gmail, Microsoft 365…). Le mot de
            passe reste sur le serveur, il n&apos;est jamais renvoyé à l&apos;écran.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-muted">
              Serveur
              <input
                className="input mt-1"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="ssl0.ovh.net"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Port
              <input
                className="input mt-1"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
              />
              Connexion sécurisée (SSL / port 465)
            </label>
            <label className="block text-xs font-semibold text-muted">
              Identifiant
              <input
                className="input mt-1"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="noreply@votre-domaine.mg"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Mot de passe
              <input
                className="input mt-1"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={
                  statut.motDePasseSmtpRenseigne ? "Inchangé si vide" : ""
                }
                autoComplete="new-password"
              />
            </label>
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
              Expéditeur (From)
              <input
                className="input mt-1"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                placeholder="Négoo <noreply@votre-domaine.mg>"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="font-display text-lg font-semibold">WhatsApp Business</h2>
          <p className="mt-1 text-xs text-muted">
            Compte Cloud API Meta (pas l&apos;application téléphone). Sans ces
            identifiants, l&apos;envoi d&apos;un PDF par WhatsApp n&apos;est pas possible.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-muted">
              Phone number ID
              <input
                className="input mt-1"
                value={whatsappPhoneNumberId}
                onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Jeton d&apos;accès
              <input
                className="input mt-1"
                type="password"
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                placeholder={
                  statut.jetonWhatsappRenseigne ? "Inchangé si vide" : ""
                }
                autoComplete="new-password"
              />
            </label>
          </div>
        </section>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
