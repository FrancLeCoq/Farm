# FrancFarm Deluxe — Francis Le Coq

Version web statique prête pour GitHub Pages.

## Ce qui est inclus

- `index.html` : page principale.
- `styles.css` : interface mobile, HUD, boutiques, panneaux.
- `src/config.js` : équilibrage du jeu : cultures, bâtiments, commandes, quêtes.
- `src/game.js` : moteur canvas isométrique, économie, sauvegarde, progression hors-ligne.
- `assets/` : logo Francis, visuel Francis, guide sprite-sheet SVG.
- `manifest.webmanifest` : base PWA.

## Gameplay

- Ferme isométrique avec caméra draggable et zoom molette.
- Outils : jouer, labourer, planter, bâtir, tracer des routes.
- Cultures avec timers : blé, maïs, baies, raisin, graine dorée holder.
- Bâtiments de production : poulailler, moulin, boulangerie, tour Telegram, rocket coop holder.
- Commandes de marché avec besoins, récompenses et XP.
- Quêtes successives pour guider la progression.
- Inventaire + vente manuelle.
- Sauvegarde locale `localStorage`.
- Progression hors-ligne limitée à 8 heures.
