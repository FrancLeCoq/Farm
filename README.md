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

## Test local

Ouvre simplement `index.html` dans ton navigateur.

Pour tester le mode holder localement :

```txt
index.html?holder=1
```

ou clique sur le bouton `Holder` dans l’interface.

## Mise en ligne GitHub Pages

1. Copie tous les fichiers de ce dossier à la racine du repo : `https://github.com/FrancLeCoq/Farm/`
2. Commit + push.
3. Dans GitHub : Settings → Pages → Deploy from branch → `main` → `/root`.
4. Ouvre l’URL GitHub Pages générée.

## Prochaines améliorations conseillées

- Brancher la vraie vérification wallet Solana / TON à la place du mode `?holder=1`.
- Remplacer progressivement les sprites vectoriels canvas par des sprites PNG/WebP exportés.
- Ajouter un marché quotidien généré aléatoirement.
- Ajouter un système de saisons et événements coop.
- Ajouter des sons courts : récolte, achat, niveau, commande livrée.

## Important

Le `.xapk` fourni est uniquement utilisé comme référence de niveau de finition. Aucun asset, code ou fichier propriétaire n’est repris.
