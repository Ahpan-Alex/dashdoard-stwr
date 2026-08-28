"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import { fileToMenuLogoDataUrl, LOGO_MENU } from "@/lib/logo";
import { nomAfficheMenu } from "@/lib/identite-navigation";
import { useStore } from "@/lib/store";

export default function IdentiteMenuPage() {
  return (
    <RequirePermission permission="parametres.lire">
      <IdentiteMenuContent />
    </RequirePermission>
  );
}

function IdentiteMenuContent() {
  const identiteNavigation = useStore((s) => s.identiteNavigation);
  const updateIdentiteNavigation = useStore((s) => s.updateIdentiteNavigation);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentSessionId = useAuthStore((s) => s.currentSessionId);
  const user = useAuthStore((s) => s.user);
  void currentSessionId;
  void user;
  const peutModifier = hasPermission("navigation.identite");

  const [nom, setNom] = useState(() => identiteNavigation?.nom ?? "");
  const [logoDataUrl, setLogoDataUrl] = useState(
    () => identiteNavigation?.logoDataUrl ?? "",
  );
  const [logoError, setLogoError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setNom(identiteNavigation?.nom ?? "");
    setLogoDataUrl(identiteNavigation?.logoDataUrl ?? "");
  }, [identiteNavigation]);

  async function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoError(null);
    setMessage(null);
    try {
      const dataUrl = await fileToMenuLogoDataUrl(file);
      setLogoDataUrl(dataUrl);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Import impossible.");
    }
  }

  function enregistrer(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = updateIdentiteNavigation({
      nom: nom.trim(),
      logoDataUrl: logoDataUrl || undefined,
    });
    if (!res.ok) {
      setMessage(res.reason);
      return;
    }
    setMessage(
      "Identité du menu enregistrée. Elle s'affiche dans toute la navigation.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Identité du menu"
        description="Nom et logo affichés en haut de la colonne des menus — propres à ce compte, indépendants des documents commerciaux."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <div className="mb-4 rounded-[var(--radius)] border border-line bg-card px-4 py-3 text-sm text-muted">
        Cette identité n&apos;est pas reprise sur les factures, devis ou autres
        documents. Le nom légal et le logo des documents se règlent dans{" "}
        <strong>Entreprise &amp; fiscalité</strong>. Chaque tenant a sa propre
        configuration ; rien n&apos;est partagé entre comptes.
      </div>

      <form
        onSubmit={enregistrer}
        className="grid gap-4 rounded-[var(--radius)] border border-line bg-card p-5 sm:grid-cols-2"
      >
        <label className="block text-xs font-semibold text-muted sm:col-span-2">
          Nom affiché dans le menu
          <input
            className="input mt-1"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex. Poissonnerie du Port"
            maxLength={80}
            disabled={!peutModifier}
          />
        </label>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Logo du menu
          </p>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-sea-50/40 p-4">
            {logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoDataUrl}
                alt="Logo du menu"
                className="h-16 w-16 rounded-xl bg-sidebar object-contain p-1"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-line bg-card text-[11px] text-muted">
                Aucun
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label
                className={`btn btn-secondary ${peutModifier ? "cursor-pointer" : "pointer-events-none opacity-60"}`}
              >
                <ImagePlus className="h-4 w-4" />
                {logoDataUrl ? "Remplacer" : "Téléverser un logo"}
                <input
                  type="file"
                  accept={LOGO_MENU.accept}
                  className="hidden"
                  disabled={!peutModifier}
                  onChange={onLogoChange}
                />
              </label>
              {logoDataUrl && peutModifier && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setLogoDataUrl("")}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                  Retirer
                </button>
              )}
            </div>
            <p className="w-full text-[11px] text-muted">
              Formats : PNG, JPG ou SVG · max. 2 Mo · ratio carré ou proche (
              {LOGO_MENU.ratioMin}–{LOGO_MENU.ratioMax}) · recommandé :{" "}
              {LOGO_MENU.dimensionsRecommandees}. Affiché à 40 × 40 px à côté du
              nom, dans toute la navigation de ce compte uniquement.
            </p>
            {logoError && (
              <p className="w-full text-sm text-danger">{logoError}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-sidebar p-4 sm:col-span-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-sea-300">
            Aperçu dans le menu
          </p>
          <div className="flex items-center gap-3">
            {logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoDataUrl}
                alt=""
                className="h-10 w-10 rounded-xl bg-white object-contain p-0.5"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sea-600 text-[11px] text-white">
                —
              </div>
            )}
            <p className="truncate font-display text-lg font-semibold text-white">
              {nomAfficheMenu({ nom, logoDataUrl })}
            </p>
          </div>
        </div>

        {peutModifier ? (
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
            {message && (
              <p className="text-sm text-muted">{message}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted sm:col-span-2">
            Seul le rôle Administrateur entreprise peut modifier ce paramètre.
          </p>
        )}
      </form>
    </div>
  );
}
