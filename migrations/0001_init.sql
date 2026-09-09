-- SNAMUG GESTION - Schéma initial (Phase 1)
-- =========================================

-- Communes (configurable par le Secrétaire National)
CREATE TABLE IF NOT EXISTS communes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,          -- ex: KAL, DIX, BOK...
  region TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Utilisateurs (tous rôles confondus)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  telephone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('membre','comptable','secretaire')),
  commune_id INTEGER,                 -- NULL pour secretaire (national)
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  actif INTEGER NOT NULL DEFAULT 1,
  doit_changer_mdp INTEGER NOT NULL DEFAULT 0,
  derniere_connexion DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (commune_id) REFERENCES communes(id)
);
CREATE INDEX IF NOT EXISTS idx_users_commune ON users(commune_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Fiches Membres (artistes syndiqués)
CREATE TABLE IF NOT EXISTS membres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  numero_adhesion TEXT NOT NULL UNIQUE,
  commune_id INTEGER NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  sexe TEXT CHECK(sexe IN ('M','F')) ,
  date_naissance TEXT,
  discipline TEXT,               -- ex: Musicien, Chanteur, Comédien, DJ...
  adresse TEXT,
  photo_url TEXT,
  date_adhesion TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK(statut IN ('actif','suspendu','radie')),
  saisi_par INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (commune_id) REFERENCES communes(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (saisi_par) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_membres_commune ON membres(commune_id);
CREATE INDEX IF NOT EXISTS idx_membres_statut ON membres(statut);

-- Tarifs de cotisation par année (fixés par le Secrétaire National)
CREATE TABLE IF NOT EXISTS tarifs_cotisation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee INTEGER NOT NULL UNIQUE,
  montant_adhesion REAL NOT NULL DEFAULT 0,
  montant_cotisation_annuelle REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Paiements : adhésions, cotisations, dons
CREATE TABLE IF NOT EXISTS paiements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_recu TEXT NOT NULL UNIQUE,
  membre_id INTEGER NOT NULL,
  commune_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('adhesion','cotisation','don')),
  montant REAL NOT NULL,
  mode_paiement TEXT NOT NULL CHECK(mode_paiement IN ('especes','orange_money')),
  reference_paiement TEXT,          -- n° transaction Orange Money (optionnel)
  periode_annee INTEGER NOT NULL,
  periode_mois INTEGER,             -- NULL si annuel / don
  date_paiement TEXT NOT NULL,
  commentaire TEXT,
  statut TEXT NOT NULL DEFAULT 'valide' CHECK(statut IN ('en_attente','valide','rejete')),
  saisi_par INTEGER NOT NULL,
  valide_par INTEGER,
  valide_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (membre_id) REFERENCES membres(id),
  FOREIGN KEY (commune_id) REFERENCES communes(id),
  FOREIGN KEY (saisi_par) REFERENCES users(id),
  FOREIGN KEY (valide_par) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_paiements_membre ON paiements(membre_id);
CREATE INDEX IF NOT EXISTS idx_paiements_commune ON paiements(commune_id);
CREATE INDEX IF NOT EXISTS idx_paiements_periode ON paiements(periode_annee, periode_mois);

-- Dépenses locales des communes (petites dépenses avec justificatif)
CREATE TABLE IF NOT EXISTS depenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commune_id INTEGER,                -- NULL si dépense nationale/projet
  projet_id INTEGER,                 -- lien optionnel vers un projet (Phase 3)
  ligne_budgetaire_id INTEGER,       -- lien optionnel vers une ligne budgétaire (Phase 3)
  libelle TEXT NOT NULL,
  categorie TEXT,
  montant REAL NOT NULL,
  justificatif_url TEXT,
  date_depense TEXT NOT NULL,
  commentaire TEXT,
  statut TEXT NOT NULL DEFAULT 'valide' CHECK(statut IN ('en_attente','valide','rejete')),
  saisi_par INTEGER NOT NULL,
  valide_par INTEGER,
  valide_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (commune_id) REFERENCES communes(id),
  FOREIGN KEY (saisi_par) REFERENCES users(id),
  FOREIGN KEY (valide_par) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_depenses_commune ON depenses(commune_id);
CREATE INDEX IF NOT EXISTS idx_depenses_projet ON depenses(projet_id);

-- Projets financés par des bailleurs (Phase 3 - structure prête)
CREATE TABLE IF NOT EXISTS projets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  bailleur TEXT NOT NULL,
  montant_total REAL NOT NULL DEFAULT 0,
  devise TEXT NOT NULL DEFAULT 'GNF',
  date_debut TEXT,
  date_fin TEXT,
  description TEXT,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK(statut IN ('actif','cloture','suspendu')),
  cree_par INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cree_par) REFERENCES users(id)
);

-- Lignes budgétaires (arborescence rubriques / sous-lignes codifiées)
CREATE TABLE IF NOT EXISTS lignes_budgetaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL,
  parent_id INTEGER,               -- NULL = rubrique racine
  code TEXT NOT NULL,              -- ex: 1, 1.1, 1.1.1
  libelle TEXT NOT NULL,
  montant_alloue REAL NOT NULL DEFAULT 0,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projet_id) REFERENCES projets(id),
  FOREIGN KEY (parent_id) REFERENCES lignes_budgetaires(id)
);
CREATE INDEX IF NOT EXISTS idx_lignes_projet ON lignes_budgetaires(projet_id);
CREATE INDEX IF NOT EXISTS idx_lignes_parent ON lignes_budgetaires(parent_id);

-- Exercices comptables annuels (clôture / archivage - Phase 4)
CREATE TABLE IF NOT EXISTS exercices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee INTEGER NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'ouvert' CHECK(statut IN ('ouvert','cloture')),
  total_recettes REAL,
  total_depenses REAL,
  archive_url TEXT,
  cloture_par INTEGER,
  cloture_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cloture_par) REFERENCES users(id)
);

-- Notifications utilisateurs
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  lu INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- Paramètres généraux de l'application (logo, nom, couleurs, etc.)
CREATE TABLE IF NOT EXISTS parametres (
  cle TEXT PRIMARY KEY,
  valeur TEXT
);
