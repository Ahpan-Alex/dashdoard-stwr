# STWR — Dashboard Poissonnerie

Application Next.js (TypeScript) pour la gestion d'une poissonnerie multi-points de vente.

## Auth (Phase 1)

L’authentification est déléguée à l’API Node du repo sibling **`server-dashboard-stwr`** (sessions cookie `HttpOnly`).

1. Démarrer MySQL + API (voir le README de `server-dashboard-stwr`)
2. Configurer le frontend :

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev
```

Créer le premier admin (dans `server-dashboard-stwr/.env`) :

```bash
ADMIN_EMAIL=ton-email@stwr.mg
ADMIN_PASSWORD=un-mot-de-passe-fort
```

puis `npm run db:seed`.

Les **données métier** (stocks, factures, etc.) sont chargées depuis l’API (`GET /business`) et synchronisées automatiquement (`PUT /business`).

## Fonctionnalités

- **Entrées** — enregistrement des arrivages fournisseurs
- **Stocks** — suivi des quantités et valorisation (achat / vente)
- **Chiffre d'affaires** — vues hebdomadaire, mensuelle et annuelle
- **Points de vente** — gestion de plusieurs étals / boutiques
- **Bilan & compte de résultat** — états financiers instantanés + export impression / PDF
- **Administration** — users, rôles, sessions, audit (via API)

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Docker / Dokploy (OVH)

Image de production (Next.js `standalone`) :

```bash
docker compose up --build
```

Sur Dokploy :

- Type **Dockerfile**, contexte `.`, fichier `Dockerfile`
- Ou type **Compose**, fichier `docker-compose.dokploy.yml`
- **Build Argument** obligatoire : `NEXT_PUBLIC_API_URL=https://api.votre-domaine` (URL publique HTTPS de l’API, sans slash final)
- Domaine du service : `https://dashboard.votre-domaine`
- Port conteneur : **3000**

Cette valeur est incrustée au build : il faut rebuild si l’URL de l’API change.

Côté API, `WEB_ORIGIN` doit être exactement l’URL du dashboard, avec `COOKIE_SECURE=true` et `COOKIE_SAMESITE=none`.

## Scripts

| Commande        | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Serveur de développement |
| `npm run build` | Build de production      |
| `npm run start` | Serveur de production    |
| `npm run lint`  | ESLint                   |

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Zustand (état + persistence)
- Recharts (graphiques)
- Lucide React (icônes)
