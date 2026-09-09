-- Données initiales SNAMUG GESTION

-- 13 communes par défaut (5 communes de Conakry + exemples régionaux)
-- L'administrateur (Secrétaire National) peut les modifier/compléter depuis l'interface.
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES
  ('Kaloum', 'KLM', 'Conakry', 1),
  ('Dixinn', 'DIX', 'Conakry', 1),
  ('Matam', 'MAT', 'Conakry', 1),
  ('Ratoma', 'RAT', 'Conakry', 1),
  ('Matoto', 'MTT', 'Conakry', 1),
  ('Kindia', 'KND', 'Kindia', 1),
  ('Boké', 'BOK', 'Boké', 1),
  ('Labé', 'LAB', 'Labé', 1),
  ('Mamou', 'MAM', 'Mamou', 1),
  ('Kankan', 'KAN', 'Kankan', 1),
  ('Faranah', 'FAR', 'Faranah', 1),
  ('N''Zérékoré', 'NZR', 'N''Zérékoré', 1),
  ('Siguiri', 'SIG', 'Kankan', 1);

-- Compte Secrétaire Comptable National (admin) par défaut
-- Mot de passe par défaut : Snamug2025! (hash + salt générés côté init, voir script)
-- (Placeholder - le vrai hash sera inséré par le script d'initialisation)

-- Tarifs de cotisation 2026 par défaut
INSERT OR IGNORE INTO tarifs_cotisation (annee, montant_adhesion, montant_cotisation_annuelle) VALUES
  (2026, 50000, 60000);

-- Paramètres généraux par défaut
INSERT OR IGNORE INTO parametres (cle, valeur) VALUES
  ('app_nom', 'SNAMUG GESTION'),
  ('app_logo_url', ''),
  ('couleur_primaire', '#0A3D91'),
  ('couleur_secondaire', '#CE1126'),
  ('couleur_accent1', '#FCD116'),
  ('couleur_accent2', '#009460'),
  ('annee_exercice_courant', '2026');
