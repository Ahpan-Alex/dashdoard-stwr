"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { BonsDePreparationSubnav } from "@/components/commercial-doc-subnav";
import { PageHeader } from "@/components/page-header";
import { libelleClient } from "@/lib/commercial";
import {
  lignesPreparationDepuisCommande,
  moduleBonDePreparationActif,
  raisonGenerationBp,
} from "@/lib/bon-de-preparation";
import { filterByPos, pointDeVenteSaisieDefaut } from "@/lib/calculations";
import { numeroPieceSuivant } from "@/lib/numerotation-pieces";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function NouveauBonDePreparationPage() {
  const router = useRouter();
  const {
    commandes,
    bonsDePreparation,
    clients,
    pointsDeVente,
    parametres,
    ordresFabrication,
    emplacementsStock,
    pointDeVenteActifId,
    addBonDePreparation,
    verrouillerTransformation,
    annulerTransformation,
    finaliserTransformation,
  } = useStore();
  const actif = moduleBonDePreparationActif(parametres);
  const [commandeId, setCommandeId] = useState("");

  const commandesEligibles = useMemo(
    () =>
      filterByPos(commandes, pointDeVenteActifId).filter(
        (c) =>
          !raisonGenerationBp({
            commande: c,
            ofs: ordresFabrication ?? [],
            parametres,
          }),
      ),
    [commandes, pointDeVenteActifId, ordresFabrication, parametres],
  );

  function generer() {
    const c = commandes.find((x) => x.id === commandeId);
    const motif = raisonGenerationBp({
      commande: c,
      ofs: ordresFabrication ?? [],
      parametres,
    });
    if (!c || motif) {
      alert(motif ?? "Commande introuvable.");
      return;
    }
    const lock = verrouillerTransformation(
      "commande",
      c.id,
      "bon_de_preparation",
    );
    if (!lock.ok) {
      alert(lock.reason);
      return;
    }
    const numero = numeroPieceSuivant(
      "preparation",
      (bonsDePreparation ?? []).map((b) => b.numero),
      parametres,
    );
    const id = addBonDePreparation({
      numero,
      clientId: c.clientId,
      pointDeVenteId:
        c.pointDeVenteId ||
        pointDeVenteSaisieDefaut(pointsDeVente, pointDeVenteActifId),
      date: new Date().toISOString(),
      statut: "a_preparer",
      commandeId: c.id,
      devisId: c.devisId,
      note: c.note,
      afficherPrix: false,
      lignes: lignesPreparationDepuisCommande(
        c.lignes,
        c.pointDeVenteId,
        emplacementsStock,
      ),
    });
    const fin = finaliserTransformation({
      sourceType: "commande",
      sourceId: c.id,
      cibleType: "bon_de_preparation",
      cibleId: id,
      cibleNumero: numero,
      statutSource: c.statut === "en_transformation" ? "confirmee" : c.statut,
    });
    if (!fin.ok) {
      annulerTransformation("commande", c.id);
      alert(fin.reason);
      return;
    }
    router.push("/bons-de-preparation/liste");
  }

  return (
    <div>
      <PageHeader
        title="Nouveau bon de préparation"
        description="Rassemblement / picking entre la commande (et les OF clôturés) et le BL. Aucune écriture comptable."
      />
      <BonsDePreparationSubnav />

      {!actif ? (
        <p className="rounded-[var(--radius)] border border-line bg-card p-5 text-sm text-muted">
          Étape optionnelle. Activez-la dans Paramètres → Documents commerciaux.
        </p>
      ) : (
        <div className="max-w-lg rounded-[var(--radius)] border border-line bg-card p-5">
          <label className="block text-xs font-semibold text-muted">
            Commande validée
            <select
              className="select mt-1"
              value={commandeId}
              onChange={(e) => setCommandeId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {commandesEligibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} —{" "}
                  {libelleClient(
                    clients.find((x) => x.id === c.clientId) ?? {
                      code: "",
                      nom: c.clientId,
                    },
                  )}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-muted">
            Les OF liés, s&apos;il y en a, doivent être clôturés. Le lien
            commande → BL direct reste possible sans ce document.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            disabled={!commandeId}
            onClick={generer}
          >
            <Plus className="h-4 w-4" />
            Générer le bon de préparation
          </button>
        </div>
      )}
    </div>
  );
}
