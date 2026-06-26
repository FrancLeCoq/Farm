# Intégration Telegram Web App

Le jeu fonctionne déjà dans Telegram grâce à `telegram-web-app.js`. Quand Telegram est détecté, le jeu appelle :

- `Telegram.WebApp.ready()`
- `Telegram.WebApp.expand()`
- `Telegram.WebApp.HapticFeedback.impactOccurred()` pour les vibrations légères

## URL recommandée

Après activation de GitHub Pages :

```text
https://franclecoq.github.io/Farm/
```

## Exemple bouton inline côté bot

```js
bot.sendMessage(chatId, 'Francis lance le poulailler 🐓', {
  reply_markup: {
    inline_keyboard: [[
      { text: 'Play Francis Perfection', web_app: { url: 'https://franclecoq.github.io/Farm/' } }
    ]]
  }
});
```

## Important

GitHub Pages doit être en HTTPS. Telegram Web App refuse les URLs non sécurisées hors localhost.
