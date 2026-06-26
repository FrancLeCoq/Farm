# Francis Perfection 🐓

Jeu HTML5 gratuit, prêt à déposer dans `https://github.com/FrancLeCoq/Farm` et à lancer depuis Telegram Web App.

## Concept

Francis pilote une machine infernale du poulailler. Le joueur doit glisser chaque pièce dans la bonne empreinte avant la fin du chrono. Plus les niveaux avancent, plus il y a de pièces, de rotations, de leurres et de pression.

Le gameplay est inspiré du principe de précision / placement sous chrono, mais le code, les visuels et l’univers sont originaux pour Francis Le Coq.

## Contenu livré

- `index.html` — point d’entrée GitHub Pages / Telegram.
- `styles.css` — responsive mobile, plein écran, PWA.
- `game.js` — moteur de jeu complet en Canvas, sans dépendance payante.
- `assets/francis/` — sprites Francis optimisés depuis les visuels fournis.
- `assets/ui/` — icônes PWA.
- `site.webmanifest` — installation mobile / PWA.

## Fonctionnalités

- Jeu 100% gratuit : pas de wallet, pas de pub, pas de paiement.
- Compatible mobile, desktop et Telegram Web App.
- Drag & drop tactile/souris.
- Bouton `ROTATE` + touche `R` pour les niveaux avancés.
- Progression infinie par niveaux.
- Défi du jour seedé par date.
- Score, record local et compteur de niveaux parfaits.
- Feedbacks visuels, particules, combo, haptics Telegram si disponible.
- Sons générés en Web Audio, désactivables.

## Installation GitHub Pages

1. Dézippe le dossier.
2. Copie tous les fichiers à la racine du repo `Farm`.
3. Commit/push :

```bash
git add .
git commit -m "Add Francis Perfection game"
git push
```

4. Dans GitHub : `Settings` → `Pages` → `Deploy from a branch` → branche `main` → dossier `/root`.
5. L’URL sera généralement :

```text
https://franclecoq.github.io/Farm/
```

## Lancement Telegram

Dans BotFather :

1. `/mybots`
2. Choisir le bot Francis
3. `Bot Settings` → `Menu Button`
4. Mettre le titre, par exemple `Play Francis`
5. Mettre l’URL GitHub Pages :

```text
https://franclecoq.github.io/Farm/
```

Tu peux aussi utiliser un bouton inline Web App dans ton bot avec cette même URL.

## Tests locaux

Depuis le dossier du jeu :

```bash
python -m http.server 8080
```

Puis ouvrir :

```text
http://localhost:8080
```

## À peaufiner ensuite

- Ajouter un leaderboard Telegram côté bot.
- Ajouter des missions quotidiennes.
- Ajouter des skins Francis à débloquer gratuitement.
- Ajouter un mode “poulailler hardcore” avec pièces qui tremblent.
- Ajouter un bouton de partage du score dans Telegram.
