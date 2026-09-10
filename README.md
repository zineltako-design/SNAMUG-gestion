# SNAMUG GESTION

## Aperçu du projet
- **Nom** : SNAMUG GESTION
- **Objectif** : Application de gestion comptable décentralisée pour le Syndicat National des Artistes et Musiciens de Guinée (SNAMUG) — adhésions/cotisations par membre, comptabilité par commune, supervision nationale en temps réel.
- **Phases livrées** :
  - **Phase 1 — Socle** (authentification par rôle, communes configurables, membres, cotisations/dons, dépenses locales, dashboards, paramètres visuels).
  - **Phase 2 — Mode hors-ligne (PWA/offline-first)** : le Comptable Communal peut inscrire des membres, encaisser des paiements et saisir des dépenses (avec photo justificative) même sans connexion internet ; synchronisation automatique dès le retour du réseau.
- **Phases à venir** : Module Projets & Budgets (bailleurs, lignes budgétaires codifiées), Clôture annuelle & archivage.

## URLs
- **Aperçu sandbox (temporaire)** : https://3000-ikgvwauwini4ailfvpy2v-de59bda9.sandbox.novita.ai
- **Production** : à déployer sur Cloudflare Pages (non déployé à ce stade)

## Comptes de démonstration
| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Secrétaire Comptable National | `admin@snamug.gn` ou `620000000` | `Snamug2026!` (à changer à la 1ère connexion) |

> Les comptables communaux et membres sont créés depuis l'interface (Secrétaire National → onglet "Comptables" ; Comptable → onglet "Membres"). Un mot de passe temporaire est généré automatiquement et affiché à la création.

## Rôles et fonctionnalités livrées

### 1. Membre / Artiste syndiqué
- Espace personnel : carte de membre, statut cotisation (À jour / En retard), historique des paiements avec numéro de reçu.

### 2. Comptable Communal
- Inscription des membres de sa commune (génération automatique du n° d'adhésion `SNAMUG-<CODE>-<ANNEE>-<ID>`), avec création optionnelle d'un compte mobile pour le membre.
- Encaissement des adhésions / cotisations / dons (Espèces ou Orange Money avec n° de transaction), génération et impression du reçu numérique.
- Saisie des dépenses locales avec upload de pièce justificative (photo, stockée sur Cloudflare R2).
- Tableau de bord de sa commune (membres à jour/en retard, recettes/dépenses de l'année).

### 3. Secrétaire Comptable National (Administrateur)
- Supervision temps réel des 13 communes (et plus, communes entièrement configurables) : membres, recettes, dépenses, solde par commune.
- Gestion des communes (créer/modifier/désactiver — nombre non limité à 13).
- Gestion des comptes Comptables Communaux et Secrétaires (création, réinitialisation mot de passe, activation/désactivation).
- Paramétrage de l'identité visuelle (nom de l'app, logo à uploader manuellement, couleurs bleu/rouge/jaune/vert).
- Paramétrage des tarifs de cotisation annuelle et d'adhésion.
- Vue et validation de tous les paiements/dépenses de toutes les communes.

## Phase 2 — Mode hors-ligne (PWA / offline-first)

**Objectif** : permettre au Comptable Communal de continuer à travailler (inscriptions, encaissements, dépenses) sans connexion internet, avec synchronisation automatique et sans perte de données au retour du réseau.

### Fonctionnement
- **Détection de connectivité réelle** : un ping actif périodique (`GET /api/parametres`) complète les événements `online`/`offline` du navigateur, plus fiables que `navigator.onLine` seul. Une barre de statut fixe s'affiche en rouge ("Mode hors-ligne") ou en jaune ("Synchronisation en cours…") avec le nombre d'opérations en attente.
- **Cache local (IndexedDB, base `snamug_offline_db`)** : les listes de membres, paiements et dépenses consultées sont mises en cache localement. En cas de coupure réseau, l'application bascule automatiquement sur ces données locales (avec mention "Données locales (hors-ligne)").
- **File de synchronisation (`sync_queue`)** : toute création effectuée hors-ligne (nouvelle adhésion, encaissement, dépense) est enregistrée dans une file d'attente locale avec un identifiant temporaire (`tmp_<horodatage>_<aléatoire>`) et affichée immédiatement dans l'interface avec un badge **"En attente sync."**.
- **Fichiers en attente (`pending_files`)** : une photo de pièce justificative prise hors-ligne est conservée en local (Blob) et uploadée vers Cloudflare R2 automatiquement lors de la synchronisation.
- **Résolution des références temporaires ("chaînage")** : si un paiement est enregistré hors-ligne pour un membre lui-même créé hors-ligne (donc pas encore connu du serveur), la synchronisation traite d'abord le membre, récupère son identifiant réel, puis l'applique automatiquement au paiement avant de l'envoyer — aucune intervention manuelle n'est nécessaire.
- **Synchronisation automatique** : déclenchée dès la détection du retour réseau (événement `online`) et vérifiée toutes les 20 secondes tant que des opérations sont en attente. Un message de confirmation (toast) résume le nombre d'éléments synchronisés.
- **Application installable (PWA)** : Service Worker (`/sw.js`, cache "App Shell") permettant le chargement de l'interface hors-ligne, manifeste et icône dédiés, balises meta iOS pour l'ajout à l'écran d'accueil sur mobile.

### Vues adaptées
- **Membres** : liste et création fonctionnent hors-ligne ; les fiches en attente affichent un numéro d'adhésion provisoire (`EN ATTENTE-...`) jusqu'à la synchronisation.
- **Paiements** : recherche de membre et encaissement fonctionnent hors-ligne (y compris pour un membre non encore synchronisé) ; le reçu numéroté définitif n'est généré qu'après synchronisation.
- **Dépenses** : saisie avec photo justificative fonctionne hors-ligne ; la photo est uploadée automatiquement à la reconnexion.
- **Tableau de bord Comptable** : calcul local des statistiques (membres à jour/en retard, recettes/dépenses de l'année) à partir du cache IndexedDB lorsque le réseau est indisponible.

### Limites connues de la Phase 2
- La fiche détaillée d'un membre (historique complet) et l'impression du reçu nécessitent une connexion (elles dépendent de données croisées côté serveur).
- Le mode hors-ligne est prévu pour le rôle **Comptable Communal** ; les tableaux de bord Secrétaire National nécessitent une connexion (supervision multi-communes en temps réel).

## Entrées API principales
- `POST /api/auth/login` — connexion (email ou téléphone + mot de passe)
- `GET /api/auth/me` — profil courant
- `POST /api/auth/change-password` — changement de mot de passe
- `GET/POST/PUT/DELETE /api/communes` — gestion des communes (secrétaire national)
- `GET/POST/PUT /api/membres` — gestion des membres (comptable = sa commune, secrétaire = toutes)
- `GET/POST /api/paiements`, `PUT /api/paiements/:id/statut` — cotisations/adhésions/dons
- `GET/POST /api/depenses` — dépenses locales avec justificatif
- `GET/PUT /api/parametres`, `GET/POST /api/parametres/tarifs` — paramètres app et tarifs
- `GET /api/dashboard/national|commune|membre` — tableaux de bord par rôle
- `GET/POST /api/users`, `PUT /api/users/:id/statut`, `POST /api/users/:id/reset-password` — gestion des comptes comptables/secrétaires
- `POST /api/upload`, `GET /api/files/*` — upload/lecture fichiers (photos, justificatifs, logo) sur Cloudflare R2

## Architecture des données (Cloudflare D1 — SQLite)
- `communes` — communes configurables (nom, code, région, actif)
- `users` — comptes (membre/comptable/secretaire), cloisonnés par `commune_id`
- `membres` — fiches d'adhésion, numéro unique, statut
- `tarifs_cotisation` — montants par année
- `paiements` — adhésions/cotisations/dons avec reçu numéroté, mode de paiement, statut de validation
- `depenses` — dépenses locales avec justificatif (URL R2)
- `projets`, `lignes_budgetaires` — **structure déjà créée en base** pour la Phase 3 (Projets & Budgets), non encore exposée dans l'interface
- `exercices` — **structure déjà créée** pour la Phase 4 (clôture annuelle), non encore exposée
- `parametres` — identité visuelle et configuration générale
- `notifications` — table prête pour les alertes (non encore utilisée dans l'UI)

**Stockage fichiers** : Cloudflare R2 (photos justificatives, logo).

## Ce qui N'EST PAS encore implémenté
- Module Projets/Bailleurs et lignes budgétaires codifiées avec imputation des dépenses — schéma DB prêt, interface à construire en **Phase 3**.
- Clôture annuelle, génération de bilan PDF/Excel/ZIP, archives consultables — **Phase 4**.
- Notifications automatiques (retards de cotisation, dépassement budgétaire).
- Export PDF/Excel des rapports (actuellement seul le reçu de paiement est imprimable).
- Déploiement en production sur Cloudflare Pages (à faire sur demande).

## Guide d'utilisation rapide
1. Se connecter avec le compte Secrétaire National (voir identifiants ci-dessus) et changer le mot de passe.
2. Aller dans **Comptables** → créer un compte Comptable Communal pour chaque commune active.
3. Le comptable se connecte avec son téléphone/mot de passe temporaire, va dans **Membres** → **Nouvelle adhésion** pour inscrire les artistes.
4. Depuis **Paiements**, enregistrer les cotisations/adhésions/dons ; un reçu imprimable est généré automatiquement.
5. Le Secrétaire National suit en temps réel la situation de toutes les communes depuis **Vue d'ensemble**.
6. Dans **Paramètres**, personnaliser le nom, le logo et les couleurs de l'application, ainsi que les tarifs annuels.

## Déploiement
- **Plateforme cible** : Cloudflare Pages (Hono + D1 + R2)
- **Statut actuel** : ❌ Non déployé en production — tourne en local sandbox (Wrangler dev + D1/R2 locaux)
- **Stack technique** : Hono (TypeScript) + Vite + Cloudflare Workers/D1/R2, frontend vanilla JS modulaire + TailwindCSS (CDN)
- **Dernière mise à jour** : 2026-09-10 (Phase 2 — mode hors-ligne)
