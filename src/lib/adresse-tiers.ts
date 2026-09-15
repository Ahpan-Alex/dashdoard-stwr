import { PAYS_DEFAUT_TIERS } from "./madagascar";
import type { AdresseTiers, Tiers } from "./types";

export function adresseTiersVide(partial?: Partial<AdresseTiers>): AdresseTiers {
  return {
    ligne1: "",
    ligne2: "",
    quartier: "",
    ville: "",
    region: "",
    codePostal: "",
    pays: PAYS_DEFAUT_TIERS,
    ...partial,
  };
}

export function adresseTiersEstVide(a?: AdresseTiers | null): boolean {
  if (!a) return true;
  return ![a.libelle, a.ligne1, a.ligne2, a.quartier, a.ville, a.region, a.codePostal]
    .some((v) => (v ?? "").trim());
}

export function lignesAdresseTiers(a?: AdresseTiers | null): string[] {
  if (!a) return [];
  const lignes = [
    a.libelle,
    a.ligne1,
    a.ligne2,
    a.quartier,
    [a.codePostal, a.ville].filter((x) => (x ?? "").trim()).join(" "),
    a.region,
    a.pays && a.pays !== PAYS_DEFAUT_TIERS ? a.pays : undefined,
  ];
  return lignes.map((l) => (l ?? "").trim()).filter(Boolean);
}

export function formaterAdresseTiers(a?: AdresseTiers | null): string {
  return lignesAdresseTiers(a).join(", ");
}

export function adresseDepuisLegacy(t: Pick<Tiers, "adresse" | "ville">): AdresseTiers {
  return adresseTiersVide({
    ligne1: t.adresse ?? "",
    ville: t.ville ?? "",
    pays: PAYS_DEFAUT_TIERS,
  });
}

export function adressePrincipaleEffective(t: Tiers): AdresseTiers {
  if (t.adressePrincipale && !adresseTiersEstVide(t.adressePrincipale)) {
    return { ...adresseTiersVide(), ...t.adressePrincipale };
  }
  return adresseDepuisLegacy(t);
}

export function adresseCourrierEffective(t: Tiers): AdresseTiers {
  if (t.memeAdresseCourrier === false && t.adresseCourrier) {
    return { ...adresseTiersVide(), ...t.adresseCourrier };
  }
  return adressePrincipaleEffective(t);
}

/** Adresse de facturation (documents) — principale si « même adresse ». */
export function adresseFacturationEffective(t: Tiers): AdresseTiers {
  if (t.memeAdresseFacturation === false && t.adresseFacturation) {
    return { ...adresseTiersVide(), ...t.adresseFacturation };
  }
  return adressePrincipaleEffective(t);
}

export function adressesLivraisonEffectives(t: Tiers): AdresseTiers[] {
  if (t.memeAdresseLivraison === false && (t.adressesLivraison?.length ?? 0) > 0) {
    return t.adressesLivraison!.map((a) => ({ ...adresseTiersVide(), ...a }));
  }
  const principale = adressePrincipaleEffective(t);
  return adresseTiersEstVide(principale) ? [] : [principale];
}

export function legacyDepuisAdresse(a: AdresseTiers): {
  adresse?: string;
  ville?: string;
} {
  const ligne = [a.ligne1, a.ligne2, a.quartier]
    .map((x) => (x ?? "").trim())
    .filter(Boolean)
    .join(", ");
  return {
    adresse: ligne || undefined,
    ville: a.ville?.trim() || undefined,
  };
}

/** Recopie l'adresse principale vers les champs hérités `adresse` / `ville`. */
export function synchroniserAdresseLegacy(t: Partial<Tiers>): Pick<Tiers, "adresse" | "ville"> {
  const principale =
    t.adressePrincipale && !adresseTiersEstVide(t.adressePrincipale)
      ? t.adressePrincipale
      : undefined;
  if (!principale) {
    return {
      adresse: t.adresse,
      ville: t.ville,
    };
  }
  return legacyDepuisAdresse(principale);
}
