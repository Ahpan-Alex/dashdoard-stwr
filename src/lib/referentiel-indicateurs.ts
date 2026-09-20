export const REFERENTIEL_INDICATEURS = {
  ca_mois: {
    titre: "CA du mois",
    definition:
      "Factures fiscales validées (hors brouillon, proforma, acompte), CA HT du mois civil de la date de fin de filtre. N-1 = même mois de l'année précédente.",
  },
  ca_annuel: {
    titre: "CA annuel",
    definition:
      "Même base que le CA du mois, cumulé sur l'année civile de la date de fin de filtre, comparé à N-1.",
  },
  rentabilite_globale: {
    titre: "Rentabilité globale",
    definition:
      "Factures validées HT moins achats validés HT (tous types : marchandises, matières, services, immobilisations) sur la période filtrée. Même formule que Rentabilité palier 2.",
  },
  marge_brute: {
    titre: "Marge brute",
    definition:
      "CA HT facturé moins coût des marchandises vendues (CUMP). Palier 1 de rentabilité.",
  },
  delai_moyen_paiement: {
    titre: "Délai moyen de paiement",
    definition:
      "Moyenne des jours entre la date de facture et le dernier règlement (journal d'audit), uniquement pour les factures soldées de la période.",
  },
  achats_ht_periode: {
    titre: "Achats HT (période)",
    definition:
      "Achats fournisseur au statut validé, toutes natures de ligne, nets d'avoirs, sur la période et le site.",
  },
  balance_agee_clients: {
    titre: "Balance âgée clients",
    definition:
      "Somme des restes à payer clients, ventilés selon les tranches Paramètres → Tiers → Balance âgée. Créances actuelles (non filtrées par la période).",
  },
  plafond_credit_alerte: {
    titre: "Taux d'alerte plafond de crédit",
    definition:
      "Part des clients avec plafond renseigné dont l'encours atteint le seuil d'avertissement (ex. 80 %) sans forcément dépasser 100 %. Le blocage de vente n'intervient qu'au dépassement total.",
  },
  bat_versions_moyennes: {
    titre: "Versions avant validation",
    definition:
      "Nombre moyen de versions (V1, V2…) du cycle au moment de la validation finale.",
  },
  bat_delai_validation: {
    titre: "Délai moyen de validation",
    definition:
      "Jours calendaires entre la première version du cycle et la date de validation interne.",
  },
  bat_taux_dupliques: {
    titre: "Taux de BAT dupliqués",
    definition:
      "Part des cycles issus d'une duplication « même client / même produit », hors gabarits multi-clients et créations from scratch.",
  },
  bat_en_retard: {
    titre: "BAT en retard de relance",
    definition:
      "Cycles dont la dernière version est encore « En attente » au-delà du délai paramétré (Paramètres BAT). Notification in-app uniquement.",
  },
  production_respect_delais: {
    titre: "Respect des délais OF",
    definition:
      "OF clôturés (ou clôturés-annulés) de la période dont la date de clôture réelle est ≤ date de clôture prévue. Les OF sans date prévue sont exclus.",
  },
  production_ecarts: {
    titre: "Écarts de fabrication",
    definition:
      "Somme des montants d'écart de clôture OF de l'atelier sur la période (donnée brute de perte / reliquat valorisé).",
  },
  production_perte_matiere: {
    titre: "Perte matière",
    definition:
      "Reliquat non retourné ÷ quantités sorties de l'atelier. Donnée brute distincte du rendement matière (comparaison à la nomenclature).",
  },
  production_rendement_matiere: {
    titre: "Rendement matière",
    definition:
      "Quantité théorique nomenclature (BOM × qté prévue) ÷ matière réellement sortie, par atelier et période. Un rendement < 100 % signifie une consommation supérieure à la nomenclature. Distinct de l'écart / perte tracé à la clôture.",
  },
  production_cycle: {
    titre: "Cycle moyen",
    definition:
      "Jours entre création et clôture réelle des OF de l'atelier.",
  },
  production_charge: {
    titre: "Charge atelier",
    definition:
      "Part des heures MOD de l'atelier dans le total (aucune capacité nominale n'est paramétrée).",
  },
  production_cout_mod: {
    titre: "Coût MOD",
    definition:
      "Lignes MOD saisies sur les OF, taux horaire figé à la saisie.",
  },
  production_consommables: {
    titre: "Consommables / entretien",
    definition:
      "Sorties atelier (pièces d'usure et consommables) valorisées au CUMP, hors OF.",
  },
  missions_avances: {
    titre: "Avances de caisse en cours",
    definition:
      "Somme des fonds validés des missions encore ouvertes (hors clôturées, annulées, rejetées).",
  },
  missions_divers: {
    titre: "Dépenses diverses",
    definition:
      "Total des dépenses diverses des missions dont la date de clôture (ou de création) est dans la période.",
  },
  missions_ecart_moyen: {
    titre: "Écart moyen avance / réel",
    definition:
      "Moyenne, sur les missions de la période ayant une avance, de (fonds validés − achats réalisés − dépenses diverses). Positif = reliquat, négatif = dépassement.",
  },
  missions_ecart_acheteur: {
    titre: "Écart moyen par acheteur",
    definition:
      "Moyenne glissante (dernières missions clôturées avec avance) de l'écart avance / réel, par acheteur. Une alerte in-app se déclenche si le montant ou le pourcentage dépasse le seuil paramétré.",
  },
  marge_theorique_alerte: {
    titre: "Alerte marge théorique",
    definition:
      "Produits semi-finis et finis dont la marge (prix de vente catalogue − coût de revient théorique cascadé) passe sous le seuil d'avertissement (orange) ou le seuil critique (rouge, coût ≥ prix par défaut). Recalculé à chaque consultation, sans valeur stockée.",
  },
  bon_de_preparation_attente: {
    titre: "En attente de préparation",
    definition:
      "Bons de préparation au statut « À préparer » ou « En cours ». Document logistique interne (picking), sans écriture comptable ni TVA. N'empêche pas le lien direct commande → BL.",
  },
  bon_de_preparation_versions: {
    titre: "Versions du bon de préparation",
    definition:
      "Chaque changement de statut et chaque sauvegarde manuelle crée une version (qui / quand / contenu). Le document n'est pas fiscal : l'export PDF reflète l'état courant, fidèle à l'aperçu (couleurs et mise en forme du modèle).",
  },
  relances_impayes: {
    titre: "Relances impayés",
    definition:
      "Factures fiscales encore dues (reste à payer > 0). La file « aujourd'hui » regroupe les échéances dépassées, les factures jamais relancées, et celles dont la prochaine relance est due. Chaque relance est historisée (qui, quand, canal, note).",
  },
} as const;

export type IdIndicateur = keyof typeof REFERENTIEL_INDICATEURS;

export function definitionIndicateur(id: IdIndicateur) {
  return REFERENTIEL_INDICATEURS[id];
}
