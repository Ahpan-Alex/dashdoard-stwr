import type { ModeleDocument } from "@/lib/document-templates";
import type {
  Facture,
  Parametres,
  SnapshotPresentationDocument,
} from "@/lib/types";

export type { SnapshotPresentationDocument, SnapshotParametresDocument } from "@/lib/types";

/** Facture fiscale émise : présentation figée (hors brouillon / proforma). */
export function estFacturePresentationFigee(
  f: Pick<Facture, "type" | "statut">,
): boolean {
  if (
    f.type === "proforma" ||
    f.statut === "proforma" ||
    f.statut === "brouillon"
  ) {
    return false;
  }
  return true;
}

export function creerSnapshotPresentation(
  parametres: Parametres,
  modele?: ModeleDocument,
): SnapshotPresentationDocument {
  return {
    parametres: {
      nomEntreprise: parametres.nomEntreprise,
      formeJuridique: parametres.formeJuridique,
      nif: parametres.nif,
      stat: parametres.stat,
      rcs: parametres.rcs,
      adresse: parametres.adresse,
      ville: parametres.ville,
      telephone: parametres.telephone,
      email: parametres.email,
      rib: parametres.rib,
      banque: parametres.banque,
      logoDataUrl: parametres.logoDataUrl,
      signatureDataUrl: parametres.signatureDataUrl,
      signatureNom: parametres.signatureNom,
      conditionsPaiementDefaut: parametres.conditionsPaiementDefaut,
      regimeFiscal: parametres.regimeFiscal,
      assujettiTVA: parametres.assujettiTVA,
      tauxTVA: parametres.tauxTVA,
    },
    modele: modele
      ? {
          rubriques: [...modele.rubriques],
          mentionsLegales: modele.mentionsLegales,
          piedDePage: modele.piedDePage,
        }
      : undefined,
  };
}

/**
 * Snapshot pour factures déjà validées avant cette fonctionnalité :
 * fige l'état courant sans rétro-appliquer une signature nouvellement ajoutée.
 */
export function creerSnapshotPresentationLegacy(
  parametres: Parametres,
  modele?: ModeleDocument,
): SnapshotPresentationDocument {
  const snap = creerSnapshotPresentation(parametres, modele);
  return {
    ...snap,
    parametres: {
      ...snap.parametres,
      signatureDataUrl: undefined,
      signatureNom: undefined,
    },
  };
}

export function presentationPourFacture(
  facture: Facture,
  parametresLive: Parametres,
  modeleLive: ModeleDocument | undefined,
): { parametres: Parametres; modele: ModeleDocument | undefined } {
  if (!estFacturePresentationFigee(facture)) {
    return { parametres: parametresLive, modele: modeleLive };
  }

  const snap = facture.presentation;
  if (!snap) {
    return {
      parametres: {
        ...parametresLive,
        signatureDataUrl: undefined,
        signatureNom: undefined,
      },
      modele: modeleLive,
    };
  }

  const parametres: Parametres = {
    ...parametresLive,
    ...snap.parametres,
  };

  const modele: ModeleDocument | undefined = snap.modele
    ? {
        id: modeleLive?.id ?? "presentation-snap",
        nom: modeleLive?.nom ?? "Émission",
        type: "facture",
        actif: true,
        rubriques: snap.modele.rubriques,
        mentionsLegales: snap.modele.mentionsLegales,
        piedDePage: snap.modele.piedDePage,
      }
    : modeleLive;

  return { parametres, modele };
}

/** Attache un snapshot manquant aux factures fiscales (migration / création). */
export function avecPresentationSiBesoin(
  facture: Facture,
  parametres: Parametres,
  modele: ModeleDocument | undefined,
  opts?: { legacySansSignature?: boolean },
): Facture {
  if (!estFacturePresentationFigee(facture) || facture.presentation) {
    return facture;
  }
  return {
    ...facture,
    presentation: opts?.legacySansSignature
      ? creerSnapshotPresentationLegacy(parametres, modele)
      : creerSnapshotPresentation(parametres, modele),
  };
}
