export type LignePlanComptable = { numero: string; libelle: string };

/**
 * Référentiel par défaut embarqué (Steward).
 * Hors comptes de TVA 445x — création manuelle.
 */
const PCG_2005_CSV = `numero;libelle
10;Capital, réserves et assimilés
101;Capital
104;Primes liées au capital social
105;Ecart d'évaluation
106;Réserves
107;Ecart d'équivalence
108;Compte de l'exploitant
109;Actionnaires, capital souscrit non appelé
11;Report à nouveau
110;Report à nouveau solde créditeur
119;Report à nouveau solde débiteur
12;Résultat de l'exercice
120;Résultat de l'exercice (bénéfice)
128;Résultat provisoire
129;Résultat de l'exercice (perte)
13;Produits et charges différés - hors cycle d'exploitation
131;Subventions d'équipement
132;Autres subventions d'investissement
133;Impôts différés actif
134;Impôts différés passif
138;Autres produits et charges différés
139;Subventions d'investissement inscrites au compte de résultat
14;Provisions réglementées
142;Provisions réglementées relatives aux immobilisations
143;Provisions réglementées relatives aux stocks
144;Provisions réglementées relatives aux autres éléments de l'actif
145;Amortissements dérogatoires
146;Provisions spéciale de réévaluation
147;Plus-values réinvesties
148;Autres provisions réglementées
15;Provisions pour charges - passifs non courants
153;Provisions pour pensions et obligations similaires
155;Provisions pour impôts
156;Provisions pour renouvellement des immobilisations (concession)
158;Autres provisions pour charges - passifs non courants
16;Emprunts et dettes assimilés
161;Emprunts obligataires convertibles
163;Autres emprunts obligataires
164;Emprunts auprès des établissements de crédit
165;Dépôts et cautionnements reçus
167;Dettes sur contrat de location-financement
168;Autres emprunts et dettes assimilés
169;Primes de remboursement des obligations
17;Dettes rattachées à des participations
171;Dettes rattachées à des participations groupe
172;Dettes rattachées à des participations hors groupe
173;Dettes rattachées à des sociétés en participation
178;Autres dettes rattachés à des participations
18;Comptes de liaison des établissements et sociétés en participation
181;Comptes de liaison entre établissements
188;Comptes de liaison entre sociétés en participation
20;Immobilisations incorporelles
201;Frais d'établissements
203;Frais de développement immobilisables
204;Logiciels informatiques et assimilés
205;Concessions et droits similaires, brevets, licences, marques
207;Fonds commercial
208;Autres immobilisations incorporelles
21;Immobilisations corporelles
211;Terrains
212;Agencements et aménagements de terrain
213;Constructions
215;Installations techniques
218;Autres immobilisations corporelles
22;Immobilisations mises en concession
221;Terrains en concession
222;Agencements et aménagements de terrain en concession
223;Constructions en concession
225;Installations techniques en concession
228;Autres immobilisations corporelles en concession
229;Droits du concédant
23;Immobilisations en cours
232;Immobilisations corporelles en cours
237;Immobilisations incorporelles en cours
238;Avances et acomptes versés sur commandes d'immobilisations
26;Participations et créances rattachées à des participations
261;Titres de participation
262;Autres formes de participations
265;Titres de participation évalués par équivalence
266;Créances rattachées à des participations groupe
267;Créances rattachées à des participations hors groupe
268;Créances rattachées à des sociétés en participation
269;Versements restant à effectuer sur titres de participation non libérés
27;Autres immobilisations financières
271;Titres immobilisés autres que les titres immobilisés de l'activité de portefeuille
272;Titres représentatifs de droit de créance (obligations, bons)
273;Titres immobilisés de l'activité de portefeuille
274;Prêts
275;Dépôts et cautionnements versés
276;Autres créances immobilisées
277;Actions propres (ou parts propres)
279;Versements restant à effectuer sur titres immobilisés non libérés
28;Amortissement des immobilisations
280;Amortissement des immobilisations incorporelles
281;Amortissement des immobilisations corporelles
282;Amortissement des immobilisations mises en concession
29;Pertes de valeur sur immobilisations
290;Perte de valeur sur immobilisations incorporelles
291;Perte de valeur sur immobilisations corporelles
292;Dépréciation sur immobilisations mises en concession
293;Perte de valeur sur immobilisations en cours
296;Perte de valeur sur participations et créances rattachées à participations
297;Perte de valeur sur autres immobilisations financières
31;Matières premières et fournitures
32;Autres approvisionnements
321;Matières consommables
322;Fournitures consommables
326;Emballages
33;En cours de production de biens
331;Produits en cours
335;Travaux en cours
34;En cours de production de services
341;Etudes en cours
345;Prestations de service en cours
35;Stocks de produits
351;Produits intermédiaires
355;Produits finis
358;Produits résiduels ou matières de récupération (déchets, rebuts)
37;Stocks de marchandises
38;Stocks à l'extérieur (en cours de route, en dépôt ou en consignation)
39;Pertes de valeur sur stocks et en cours
391;Pertes de valeur Matières premières et fournitures
392;Pertes de valeur Autres approvisionnements
393;Pertes de valeur En cours de production de biens
394;Pertes de valeur En cours de production de services
395;Pertes de valeur Stocks de produits
397;Pertes de valeur Stocks de marchandises
398;Pertes de valeur Stocks à l'extérieur
40;Fournisseurs et comptes rattachés
401;Fournisseurs de biens et services
403;Fournisseurs effets à payer
404;Fournisseurs d'immobilisations
405;Fournisseurs d'immobilisations effets à payer
408;Fournisseurs factures non parvenues
409;Fournisseurs débiteurs : avances et acomptes, RRR à obtenir, autres créances
41;Clients et comptes rattachés
411;Clients
413;Clients effets à recevoir
416;Clients douteux
417;Créances sur travaux non encore facturables
418;Clients - produits non encore facturés
419;Clients créditeurs
42;Personnel et comptes rattachés
421;Personnel, rémunérations dues
422;Fonds sociaux - œuvres sociales
425;Personnel, avances et acomptes accordés
426;Personnel, dépôts reçus
427;Personnel, oppositions
428;Personnel, charges à payer et produits à recevoir
43;Organismes sociaux et comptes rattachés
431;Organismes sociaux A
432;Organismes sociaux B
438;Organismes sociaux, charges à payer
44;Etat, collectivités publiques, organismes internationaux
441;Etat, subventions à recevoir
442;Etat, impôts et taxes recouvrables sur des tiers
443;Opérations particulières avec l'Etat et autres organismes publiques
444;Etat, impôts sur les résultats
447;Autres impôts, taxes et versements assimilés
448;Etat, charges à payer et produits à recevoir
45;Groupe et Associés
451;Opérations Groupe
455;Associés - comptes courants
456;Associés, opérations sur le capital
457;Associés, dividendes à payer
458;Associés, opérations faites en commun ou en groupement
46;Débiteurs divers et créditeurs divers
462;Créances sur cessions d'immobilisations
464;Dettes sur acquisitions de valeurs mobilières de placement
465;Créances sur cessions de valeurs mobilières de placement
467;Autres comptes débiteurs ou créditeurs
468;Divers charges à payer ou produits à recevoir
47;Comptes transitoires ou d'attente
471;Comptes d'attente
48;Charges ou produits constatés d'avance et provisions
481;Provisions - passifs courants
486;Charges constatées d'avance
487;Produits constatés d'avance
49;Pertes de valeur sur comptes de tiers
491;Pertes de valeur sur comptes de clients
495;Pertes de valeur sur comptes du groupe et des associés
496;Pertes de valeur sur comptes de débiteurs divers
50;Valeurs mobilières de placement
501;Part dans des entreprises liées
503;Actions
504;Autres titres conférant un droit de propriété
505;Obligations et bons émis par la société et rachetés par elle
506;Obligations
507;Bons du trésor et bons de caisse à court terme
508;Autres valeurs mobilières de placement et créances assimilés
509;Versements restant à effectuer sur VMP non libérées
51;Banques, établissements financiers et assimilés
511;Valeurs à l'encaissement
512;Banques comptes courants
515;Caisse du Trésor Public et établissements publics
517;Autres organismes financiers
518;Intérêts courus
519;Concours bancaires courants
52;Instruments de trésorerie
53;Caisse
54;Régies d'avances et accréditifs
58;Virements internes
581;Virements de fonds
588;Autres virements internes
59;Pertes de valeur sur comptes financiers
591;Pertes de valeur sur valeurs en banque et Ets financiers
594;Pertes de valeur sur régies d'avances et accréditifs
60;Achats consommés
601;Matières premières
602;Autres approvisionnements
603;Variations des stocks
604;Achats d'études et de prestations de service
605;Achats de matériels, équipements et travaux
606;Achats non stockés de matières et fournitures
607;Achats de marchandises
608;Frais accessoires d'achat
609;Rabais, remises, ristournes obtenus sur achats
61;Services extérieurs
611;Sous-traitance générale
613;Locations
614;Charges locatives et charges de copropriété
615;Entretien, réparations et maintenance
616;Primes d'assurances
617;Etudes et recherches
618;Documentation et divers
619;Rabais, remises, ristournes obtenus sur services extérieurs
62;Autres services extérieurs
621;Personnel extérieur à l'entreprise
622;Rémunérations d'intermédiaires et honoraires
623;Publicité, publication, relations publiques
624;Transports de biens et transport collectif du personnel
625;Déplacements, missions et réceptions
626;Frais postaux et de télécommunications
627;Services bancaires et assimilés
628;Cotisations et divers
629;Rabais, remises, ristournes obtenus sur autres services extérieurs
63;Impôts, taxes et versements assimilés
631;Impôts, taxes et versements assimilés sur rémunérations
635;Autres impôts et taxes
64;Charges de personnel
641;Rémunérations du personnel
644;Rémunérations des dirigeants
645;Cotisations aux organismes sociaux
646;Charges sociales sur rémunérations des dirigeants
647;Autres charges sociales
648;Autres charges de personnel
65;Autres charges des activités ordinaires
651;Redevances pour concessions, brevets, licences, logiciels et valeurs similaires
652;Moins values sur cessions d'actifs non courants
653;Jetons de présence
654;Pertes sur créances irrécouvrables
655;Quote-part de résultat sur opérations faites en commun
656;Amendes et pénalités, subventions accordées, dons et libéralités
657;Charges exceptionnelles de gestion courante
658;Autres charges de gestion courante
66;Charges financières
661;Charges d'intérêts
664;Pertes sur créances liées à des participations
665;Moins-values sur titres de placement
666;Pertes de change
667;Moins-values sur instruments financiers et assimilés
668;Autres charges financières
67;Eléments extraordinaires (charges)
671;Charges exceptionnelles sur opérations de gestion
672;Charges sur exercices antérieurs (en cours d'exercice seulement)
673;Autres charges exceptionnelles
68;Dotations aux amortissements, provisions, pertes de valeur
681;Dotations - actifs non courants
685;Dotations - actifs courants
69;Impôts sur les bénéfices
692;Imposition différée actif
693;Imposition différée passif
695;Impôts sur les bénéfices basés sur le résultat des activités ordinaires
698;Autres impôts sur les résultats
70;Ventes de produits fabriqués, marchandises, prestations
701;Ventes de produits finis
702;Ventes de produits intermédiaires
703;Ventes de produits résiduels
704;Vente de travaux
705;Vente d'études
706;Vente de prestations de service
707;Ventes de marchandises
708;Produits des activités annexes
709;Rabais, remises et ristournes accordés
71;Production stockée (ou déstockage)
713;Variation de stocks d'en-cours
714;Variation de stocks de produits
72;Production immobilisée
721;Production immobilisée d'actif incorporel
722;Production immobilisée d'actif corporel
74;Subventions d'exploitation
741;Subvention d'équilibre
748;Autres subventions d'exploitation
75;Autres produits opérationnels
751;Redevances pour concessions, brevets, licences, logiciels et valeurs similaires
752;Plus-values sur cessions d'actifs non courants
753;Jetons de présence et rémunérations d'administrateurs ou de gérant
754;Quotes-parts de subventions d'investissement virées au résultat de l'exercice
755;Quote-part de résultat sur opérations faites en commun
756;Libéralités perçues, rentrées sur créances amorties
757;Produits exceptionnels sur opérations de gestion
758;Autres produits de gestion courante
76;Produits financiers
761;Produits de participations
762;Produits des autres immobilisations financières
763;Revenus des autres créances
764;Revenus et plus-values des valeurs mobilières de placement
766;Gains de change
767;Produits nets sur cessions de valeurs mobilières de placement
768;Autres produits financiers
77;Eléments extraordinaires (produits)
771;Produits exceptionnels sur opérations de gestion
772;Produits exercices antérieurs (en cours d'exercice seulement)
773;Autres produits exceptionnels
78;Reprises sur provisions et pertes de valeur
781;Reprise d'exploitation - actifs non courants
785;Reprise d'exploitation - actifs courants
786;Reprises financières`;

function parserReferentiel(csv: string): LignePlanComptable[] {
  const lignes: LignePlanComptable[] = [];
  for (const line of csv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf(";");
    if (sep < 0) continue;
    const numero = trimmed.slice(0, sep).replace(/\D/g, "");
    const libelle = trimmed.slice(sep + 1).trim();
    if (!numero || /numero/i.test(numero)) continue;
    if (numero.startsWith("445")) continue;
    if (!libelle) continue;
    lignes.push({ numero, libelle });
  }
  return lignes;
}

export const PLAN_PCG_2005: LignePlanComptable[] = parserReferentiel(PCG_2005_CSV);
