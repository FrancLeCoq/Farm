# 🐓 FrancFarm — La ferme du Coq Francis

Jeu de ferme (plantation + élevage + chaîne de production) de l'univers **$FRANC**,
jouable directement dans Telegram via **@FrancisLeCoqBot**.

## ▶️ Jouer
Fichier unique `index.html` — aucune dépendance externe, tous les assets sont embarqués.
Déployable en l'état sur GitHub Pages.

## 🎮 Contenu
- **Cultures** : blé, maïs, tomates, carottes + premium (fraises, citrouilles, tournesols)
- **Animaux** : poule, vache, mouton + premium (cochon, cheval) — à nourrir pour produire
- **Chaîne de production** : moulin → boulangerie → fromagerie → pâtisserie
- **Village** : chien de garde, chat, poney, épouvantail (bonus passifs)
- **Événements** : intempéries (soleil / pluie / orage / nuit) + renards à chasser
- **Rétention** : quêtes quotidiennes, série de connexion, progression par niveaux
- **Monnaie** : $FRANC fictifs gagnés en jeu

## 🔒 Gating $FRANC
- **Mode découverte** (non-holders) : ferme plafonnée à 4×4, contenu premium verrouillé
- **Holders $FRANC** : tout débloqué
- Test holder : ajouter `?holder=1` à l'URL
- En prod : remplacer `detectHolder()` par un vrai check on-chain via le bot

## 🚀 Déploiement GitHub Pages
1. Pousser `index.html` dans le repo
2. Settings → Pages → Branch `main` → `/root`
3. Pointer le bouton Web App de @FrancisLeCoqBot sur l'URL Pages

---

## ⚖️ Propriété & licence

© 2026 Benoît — Projet $FRANC / Le Coq Francis. Tous droits réservés.

Ce jeu, son code source et ses visuels (mascotte Francis incluse) sont des créations
originales. Le code est publié à titre de consultation et d'exécution. Toute reproduction,
redistribution, modification ou réutilisation, totale ou partielle, sans autorisation
écrite préalable de l'auteur est interdite.

$FRANC, Le Coq Francis et leurs visuels sont l'identité du projet.

> ℹ️ Un repo public reste lisible par construction : le copyright dissuade plus qu'il
> n'empêche. Pour une vraie protection, garder le code source en repo **privé** et ne
> publier que le rendu via Pages. Pour un enjeu lié au token, consulter un juriste.
