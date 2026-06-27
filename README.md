# Francis Farm

Version réécrite en profondeur pour se rapprocher du **type de jeu contenu dans l'APK fourni** : un farm/city builder mobile avec cultures, productions, commandes, ville, niveaux, stock et progression persistante.

Important : l'APK fourni identifie le package `com.playrix.township` / **Township**. Le dépôt ci-dessous ne copie ni code ni assets propriétaires. C'est une version originale, gratuite, adaptée à Francis le Coq et jouable dans Telegram.

## Gameplay inclus

- Carte isométrique farm/town.
- Cultures : blé, maïs, carotte avec timers.
- Récolte au clic quand la culture est prête.
- Usines : boulangerie, moulin, poulailler producteur, laiterie.
- Recettes : pain, nourriture, œufs, lait, confiture.
- Commandes hélicoptère façon mobile builder.
- FrancExpress : livraisons par train à partir du niveau 3.
- Construction : champs, maisons, usines, marché, décoration 1F.
- XP, niveaux, population, pièces et gems gratuits.
- Objectifs tutoriels.
- Progression sauvegardée en `localStorage`.
- Production qui continue même si Telegram est fermé, grâce aux timestamps.
- Intégration Telegram Web App : ready, expand, haptic feedback.
- Aucun paiement, aucune pub, aucun wallet-gate : gratuité totale.

## Installation GitHub Pages

1. Dézipper `francis-farm-township.zip`.
2. Copier tout le contenu du dossier `francis-farm-township` à la racine du repo :
   `https://github.com/FrancLeCoq/Farm`
3. Commit / push.
4. Dans GitHub : `Settings` → `Pages` → `Deploy from branch` → `main` → `/root`.
5. L'URL devrait être :

```text
https://franclecoq.github.io/Farm/
```

## Lancement via Telegram

Dans BotFather :

- `Menu Button` → `Configure menu button`
- URL : `https://franclecoq.github.io/Farm/`
- Nom : `Francis Farm`

Le jeu fonctionne aussi directement dans un navigateur mobile.

## Fichiers clés

- `index.html` : page principale.
- `styles.css` : interface responsive / mobile.
- `game.js` : tout le gameplay.
- `manifest.webmanifest` : PWA / icône.
- `assets/characters/` : visuels Francis.
- `assets/ui/icon.png` : icône du jeu.
- `docs/cover.png` : visuel de présentation.

## Axes de peaufinage possibles

- Ajouter des bâtiments premium mais toujours gratuits.
- Ajouter un système de coopérative entre joueurs Telegram.
- Ajouter des classements hebdomadaires.
- Ajouter des trains, avions, port et pêche.
- Ajouter un mode holder plus tard, sans bloquer le jeu gratuit.
