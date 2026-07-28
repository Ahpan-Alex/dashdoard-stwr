# STWR — Dashboard Poissonnerie

Application Next.js (TypeScript) pour la gestion d'une poissonnerie multi-points de vente.

## Fonctionnalités

- **Entrées** — enregistrement des arrivages fournisseurs
- **Stocks** — suivi des quantités et valorisation (achat / vente)
- **Chiffre d'affaires** — vues hebdomadaire, mensuelle et annuelle
- **Points de vente** — gestion de plusieurs étals / boutiques
- **Bilan & compte de résultat** — états financiers instantanés + export impression / PDF

Les données de démo sont persistées dans le navigateur (localStorage).

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

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
