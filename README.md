# MONARQUE — plateforme de réservation cinéma & restaurants

Application React (Vite, Tailwind CSS v4, GSAP 3.13, React Konva).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Mode démonstration

Sans `VITE_API_URL`, l'application fonctionne avec un **serveur de démonstration** qui tourne dans le navigateur
(`src/services/demo/demoServer.js`). Les données sont stockées dans le `localStorage`. Films, établissements,
adresses et comptes sont **fictifs**. Les photos viennent d'Unsplash et sont à remplacer par les vraies.

Comptes de démo : un bouton par rôle sur `/connexion`. Les identifiants sont dans `src/services/demo/seed.js`.
Pour remettre les données à zéro : Administration → Tableau de bord → « Réinitialiser la démo » (super admin).

## Brancher le vrai backend

Renseignez `VITE_API_URL` (voir `.env.example`). `src/services/api/client.js` appelle alors les **mêmes routes REST**
que le serveur de démo. Le contrat est la liste `route(...)` de `demoServer.js` :

| Domaine | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET/PATCH /auth/me` |
| Films / séances | `GET/POST /films`, `PUT/DELETE /films/:id`, `GET/POST /sessions`, `GET /sessions/:id`, `GET /sessions/:id/seats` |
| Salles / restaurants | `GET/POST /halls`, `PUT /halls/:id`, `GET/POST /restaurants`, `GET/PUT/DELETE /restaurants/:id`, `GET /restaurants/:id/availability` |
| Plans | `GET /plans/:id` (`?draft=1`), `PUT /plans/:id/draft`, `POST /plans/:id/publish`, `POST /plans/:id/restore/:version` |
| Réservations | `POST /reservations` (verrou), `GET /reservations/:id`, `PATCH /reservations/:id/customer`, `POST /reservations/:id/confirm`, `POST /reservations/:id/cancel`, `POST /reservations/lookup`, `GET /me/reservations` |
| Paiements | `GET /payments/methods`, `POST /payments/init`, `GET /payments/:id/verify`, `GET /me/transactions` |
| Admin | `/admin/stats`, `/admin/reservations`, `/admin/reservations/:id/status`, `/admin/transactions`, `/admin/transactions/:id/refund`, `/admin/users` |

Règles que le backend doit appliquer (déjà simulées en démo) :

- **Verrou de 8 minutes** : `POST /reservations` crée une réservation `pending_payment` avec `expiresAt`. Le contrôle de
  conflit et l'écriture se font dans une seule transaction, avec une contrainte d'unicité `(session_id, seat_id)` sur
  les réservations actives. Les verrous expirés passent en `expired`.
- **Transitions de statut** contrôlées côté serveur : `pending_payment → confirmed | cancelled | expired`,
  `confirmed → completed | cancelled | refunding`, `refunding → cancelled`.
- **Permissions** revérifiées à chaque appel (`src/utils/permissions.js`).
- **Réservation invitée** : un jeton d'accès est renvoyé à la création, et la référence + l'e-mail permettent de la retrouver.

## SycaPay — à compléter avec la documentation officielle

Le frontend ne connaît **aucune** clé ni route SycaPay. Il appelle seulement le backend :
`POST /payments/init` (avec une clé d'idempotence), puis redirige vers `checkoutUrl` s'il est fourni. Au retour sur
`/reservation/:id/paiement?tx=…`, il interroge `GET /payments/:id/verify`. La réservation n'est confirmée que par le
serveur, après la notification SycaPay vérifiée.

Les moyens de paiement (Orange Money, MTN, Moov, Wave, Visa, Mastercard) restent affichés « à confirmer » tant que
`GET /payments/methods` ne les renvoie pas dans `verified`. **Les endpoints, l'authentification et la vérification de
signature SycaPay ne sont pas implémentés** : ils attendent la documentation officielle.

## Architecture

```
src/
  animations/   GSAP : config, transitions de page, hero, scroll, cinéma, restaurant, réservation, micro-interactions
  hooks/        useGsap (gsap.context + revert), useScrollAnimation, usePanZoom, useLiveRefresh, useCountdown, useAsync
  services/     client API, services métier, serveur de démo + données, moyens de paiement
  components/   common, layout, cinema, floor-plan (SeatMap, RestaurantFloor, editor/), reservation, payment, dashboard
  pages/        public, cinema, restaurants, reservation, auth, admin
  utils/        format, permissions, validation, générateurs et validation de plans, horaires, CSV
```

Modèle d'un élément de plan : `{ id, type, x, y, width, height, rotation, capacity, category, status, label, properties }`.
Les coordonnées sont exprimées dans la scène de référence du plan (`plan.width × plan.height`) : le rendu SVG côté
client s'adapte donc à toutes les tailles d'écran.

`prefers-reduced-motion` est respecté : les animations sont remplacées par de simples fondus.
