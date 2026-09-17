import type { BatStatut, BonATirer, OrdreFabrication } from "./types";

export const BAT_STATUTS: Record<BatStatut, string> = {
  en_attente: "En attente",
  modifications_demandees: "Modifications demandées",
  valide: "Validé",
};

export const BAT_FICHIER = {
  accept: "image/png,image/jpeg,image/webp,application/pdf",
  maxBytes: 1_500_000,
  maxBytesLabel: "1,5 Mo",
} as const;

export function badgeBat(statut: BatStatut) {
  if (statut === "valide") return "badge-success";
  if (statut === "modifications_demandees") return "badge-sand";
  return "badge-sea";
}

export function batsPourCommande(bats: BonATirer[], commandeId: string) {
  return [...bats]
    .filter((b) => b.commandeId === commandeId)
    .sort((a, b) => a.version - b.version);
}

export function batCourant(bats: BonATirer[], commandeId: string) {
  const liste = batsPourCommande(bats, commandeId);
  return liste[liste.length - 1];
}

export function commandeABatValide(bats: BonATirer[], commandeId: string) {
  return bats.some((b) => b.commandeId === commandeId && b.statut === "valide");
}

export function prochaineVersionBat(bats: BonATirer[], commandeId: string) {
  const liste = batsPourCommande(bats, commandeId);
  return (liste[liste.length - 1]?.version ?? 0) + 1;
}

export function batEstLectureSeule(bat: BonATirer) {
  return bat.statut !== "en_attente";
}

export function batAFichier(bat: Pick<BonATirer, "fichierDataUrl">) {
  return Boolean(bat.fichierDataUrl);
}

export function motifCreationBatImpossible(
  bats: BonATirer[],
  commandeId: string,
) {
  const courant = batCourant(bats, commandeId);
  if (!courant) return null;
  if (courant.statut === "valide") {
    return "Un BAT validé existe déjà pour cette commande. L'historique est conservé en lecture seule.";
  }
  if (courant.statut === "en_attente") {
    if (!batAFichier(courant)) {
      return "Joignez d'abord le fichier de la version en attente.";
    }
    return "Enregistrez le retour client (validé ou modifications demandées) avant de créer une nouvelle version.";
  }
  return null;
}

/**
 * Blocage OF : fabrication sur commande impossible sans BAT validé,
 * sauf dérogation déjà tracée sur l'OF.
 */
export function motifBatOfManquant(
  of: Pick<OrdreFabrication, "commandeId" | "derogationBat">,
  bats: BonATirer[],
): string | null {
  if (!of.commandeId) return null;
  if (of.derogationBat) return null;
  if (commandeABatValide(bats, of.commandeId)) return null;
  return "Impossible de démarrer la production : aucun BAT validé n'est lié à cette commande. Faites valider un Bon à Tirer, ou demandez une dérogation (administrateur / comptable).";
}

export function fileToBatDataUrl(file: File): Promise<{
  nom: string;
  mime: string;
  dataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const mime = (file.type || "").toLowerCase();
    const ok =
      mime === "application/pdf" ||
      mime === "image/png" ||
      mime === "image/jpeg" ||
      mime === "image/jpg" ||
      mime === "image/webp";
    if (!ok) {
      reject(new Error("Fichier BAT : PNG, JPG, WebP ou PDF uniquement."));
      return;
    }
    if (file.size > BAT_FICHIER.maxBytes) {
      reject(
        new Error(
          `Fichier trop lourd (max. ${BAT_FICHIER.maxBytesLabel}). Compressez l'image ou le PDF.`,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      resolve({
        nom: file.name || "bat",
        mime: mime === "image/jpg" ? "image/jpeg" : mime,
        dataUrl: String(reader.result),
      });
    };
    reader.readAsDataURL(file);
  });
}
