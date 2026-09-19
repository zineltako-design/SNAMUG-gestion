-- Migration 0002 : Intégration du découpage administratif complet de la Guinée
-- (Régions -> Préfectures -> Communes/Localités)
-- Chaque Préfecture devient une nouvelle 'commune' (unité comptable), a l'image des
-- communes de Conakry déjà en place. La 'region' correspond à la Région administrative.
-- Les Communes/Localités de chaque préfecture sont stockées dans la table 'localites'
-- (référentiel d'adresses, non comptable) pour enrichir la saisie (ex: adresse des membres).

-- Nettoyage des régions existantes (espaces parasites saisis manuellement avant cette migration)
UPDATE communes SET region = TRIM(region) WHERE region IS NOT NULL AND region != TRIM(region);

CREATE TABLE IF NOT EXISTS localites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commune_id INTEGER NOT NULL,
  nom TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (commune_id) REFERENCES communes(id),
  UNIQUE(commune_id, nom)
);
CREATE INDEX IF NOT EXISTS idx_localites_commune ON localites(commune_id);

-- Nouvelles communes (Préfectures) par Région

-- Région Kindia
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Kindia', 'KND', 'Kindia', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Coyah', 'COY', 'Kindia', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Dubréka', 'DBR', 'Kindia', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Forécariah', 'FOR', 'Kindia', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Télimélé', 'TEL', 'Kindia', 1);

-- Région Boké
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Boké', 'BOK', 'Boké', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Boffa', 'BOF', 'Boké', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Fria', 'FRI', 'Boké', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Gaoual', 'GAO', 'Boké', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Koundara', 'KNDR', 'Boké', 1);

-- Région Mamou
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Mamou', 'MAM', 'Mamou', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Dalaba', 'DAL', 'Mamou', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Pita', 'PIT', 'Mamou', 1);

-- Région Labé
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Labé', 'LAB', 'Labé', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Koubia', 'KOU', 'Labé', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Lélouma', 'LEL', 'Labé', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Mali', 'MAL', 'Labé', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Tougué', 'TOU', 'Labé', 1);

-- Région Faranah
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Faranah', 'FAR', 'Faranah', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Dinguiraye', 'DIN', 'Faranah', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Dabola', 'DAB', 'Faranah', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Kissidougou', 'KIS', 'Faranah', 1);

-- Région Kankan
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Kankan', 'KAN', 'Kankan', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Kérouané', 'KER', 'Kankan', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Kouroussa', 'KRS', 'Kankan', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Mandiana', 'MND', 'Kankan', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Siguiri', 'SIG', 'Kankan', 1);

-- Région N'Zérékoré
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('N''Zérékoré', 'NZR', 'N''Zérékoré', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Beyla', 'BEY', 'N''Zérékoré', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Guéckédou', 'GCK', 'N''Zérékoré', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Lola', 'LOL', 'N''Zérékoré', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Macenta', 'MAC', 'N''Zérékoré', 1);
INSERT OR IGNORE INTO communes (nom, code, region, actif) VALUES ('Yomou', 'YOM', 'N''Zérékoré', 1);

-- Localités (Communes/Secteurs) rattachées à chaque Préfecture
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'KND'), 'Kindia-Centre'),
  ((SELECT id FROM communes WHERE code = 'KND'), 'Damakania'),
  ((SELECT id FROM communes WHERE code = 'KND'), 'Friguiagbé'),
  ((SELECT id FROM communes WHERE code = 'KND'), 'Bangouya'),
  ((SELECT id FROM communes WHERE code = 'KND'), 'Mambia'),
  ((SELECT id FROM communes WHERE code = 'KND'), 'Molota'),
  ((SELECT id FROM communes WHERE code = 'KND'), 'Samaya'),
  ((SELECT id FROM communes WHERE code = 'KND'), 'Souguéta');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'COY'), 'Coyah-Centre'),
  ((SELECT id FROM communes WHERE code = 'COY'), 'Kouriah'),
  ((SELECT id FROM communes WHERE code = 'COY'), 'Manéah'),
  ((SELECT id FROM communes WHERE code = 'COY'), 'Wonkifong');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'DBR'), 'Dubréka-Centre'),
  ((SELECT id FROM communes WHERE code = 'DBR'), 'Badi'),
  ((SELECT id FROM communes WHERE code = 'DBR'), 'Falessade'),
  ((SELECT id FROM communes WHERE code = 'DBR'), 'Khorira'),
  ((SELECT id FROM communes WHERE code = 'DBR'), 'Ouassou'),
  ((SELECT id FROM communes WHERE code = 'DBR'), 'Tanéné'),
  ((SELECT id FROM communes WHERE code = 'DBR'), 'Tondon');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Forécariah-Centre'),
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Allassoyah'),
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Benty'),
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Farmoriyah'),
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Kaback'),
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Kakossa'),
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Kallia'),
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Maférinya'),
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Moussayah'),
  ((SELECT id FROM communes WHERE code = 'FOR'), 'Sikhourou');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Télimélé-Centre'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Bourouwal'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Daramagnaky'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Gougoudjé'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Koba'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Konsotamy'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Missira'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Santou'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Sarekaly'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Sinta'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Sogolon'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Tarihoye'),
  ((SELECT id FROM communes WHERE code = 'TEL'), 'Thionthian');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Boké-Centre'),
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Bintimodiya'),
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Dabiss'),
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Kamsar'),
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Kanfarandé'),
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Kolaboui'),
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Malapouya'),
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Sangarédi'),
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Sansalé'),
  ((SELECT id FROM communes WHERE code = 'BOK'), 'Tanéné');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'BOF'), 'Boffa-Centre'),
  ((SELECT id FROM communes WHERE code = 'BOF'), 'Colia'),
  ((SELECT id FROM communes WHERE code = 'BOF'), 'Douprou'),
  ((SELECT id FROM communes WHERE code = 'BOF'), 'Koba-Tatema'),
  ((SELECT id FROM communes WHERE code = 'BOF'), 'Lisso'),
  ((SELECT id FROM communes WHERE code = 'BOF'), 'Mankountan'),
  ((SELECT id FROM communes WHERE code = 'BOF'), 'Tamita'),
  ((SELECT id FROM communes WHERE code = 'BOF'), 'Tougnifili');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'FRI'), 'Fria-Centre'),
  ((SELECT id FROM communes WHERE code = 'FRI'), 'Baguinet'),
  ((SELECT id FROM communes WHERE code = 'FRI'), 'Tormelin'),
  ((SELECT id FROM communes WHERE code = 'FRI'), 'Banguingny');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'GAO'), 'Gaoual-Centre'),
  ((SELECT id FROM communes WHERE code = 'GAO'), 'Kakony'),
  ((SELECT id FROM communes WHERE code = 'GAO'), 'Koumbia'),
  ((SELECT id FROM communes WHERE code = 'GAO'), 'Kounsitel'),
  ((SELECT id FROM communes WHERE code = 'GAO'), 'Malanta'),
  ((SELECT id FROM communes WHERE code = 'GAO'), 'Touba'),
  ((SELECT id FROM communes WHERE code = 'GAO'), 'Wendou M''Bour');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'KNDR'), 'Koundara-Centre'),
  ((SELECT id FROM communes WHERE code = 'KNDR'), 'Guingan'),
  ((SELECT id FROM communes WHERE code = 'KNDR'), 'Kamaby'),
  ((SELECT id FROM communes WHERE code = 'KNDR'), 'Sareboïdo'),
  ((SELECT id FROM communes WHERE code = 'KNDR'), 'Termessé'),
  ((SELECT id FROM communes WHERE code = 'KNDR'), 'Youkounkoun');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Mamou-Centre'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Bouliwel'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Dounet'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Gongoret'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Kégnéko'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Konkouré'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Nyagassola'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Ouré-Kaba'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Porédaka'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Sarah'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Tolo'),
  ((SELECT id FROM communes WHERE code = 'MAM'), 'Urépore');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'DAL'), 'Dalaba-Centre'),
  ((SELECT id FROM communes WHERE code = 'DAL'), 'Bodié'),
  ((SELECT id FROM communes WHERE code = 'DAL'), 'Ditinn'),
  ((SELECT id FROM communes WHERE code = 'DAL'), 'Kaalan'),
  ((SELECT id FROM communes WHERE code = 'DAL'), 'Koba'),
  ((SELECT id FROM communes WHERE code = 'DAL'), 'Mombeya'),
  ((SELECT id FROM communes WHERE code = 'DAL'), 'Mafara'),
  ((SELECT id FROM communes WHERE code = 'DAL'), 'Mitty');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Pita-Centre'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Bantignel'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Bourouwal-Tappé'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Donghol-Touma'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Gongore'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Ley-Miro'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Maci'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'N''Zao'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Sintali'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Timbi-Madina'),
  ((SELECT id FROM communes WHERE code = 'PIT'), 'Timbi-Touny');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Labé-Centre'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Dalein'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Daralabé'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Diari'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Dionfo'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Garambé'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Hafia'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Kaalan'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Kouramangui'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Popodara'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Sanoun'),
  ((SELECT id FROM communes WHERE code = 'LAB'), 'Tountouroun');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'KOU'), 'Koubia-Centre'),
  ((SELECT id FROM communes WHERE code = 'KOU'), 'Fafaya'),
  ((SELECT id FROM communes WHERE code = 'KOU'), 'Gadha-Woundou'),
  ((SELECT id FROM communes WHERE code = 'KOU'), 'Matakaou'),
  ((SELECT id FROM communes WHERE code = 'KOU'), 'Missira');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Lélouma-Centre'),
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Balaya'),
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Djountou'),
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Herico'),
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Korbe'),
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Lafou'),
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Linsan'),
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Manda'),
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Sagale'),
  ((SELECT id FROM communes WHERE code = 'LEL'), 'Parawol');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Mali-Centre'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Balaki'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Donghol-Sigon'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Dougountouny'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Fougou'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Gayah'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Himbaya'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Lébékére'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Madina-Wora'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Salambande'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Téliré'),
  ((SELECT id FROM communes WHERE code = 'MAL'), 'Yembering');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Tougué-Centre'),
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Fatako'),
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Fello-Koundoua'),
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Kansangui'),
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Koin'),
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Kolangui'),
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Kollet'),
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Konah'),
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Tangali'),
  ((SELECT id FROM communes WHERE code = 'TOU'), 'Fatoya');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Faranah-Centre'),
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Banian'),
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Beindou'),
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Gnaléah'),
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Heremakonon'),
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Kobikoro'),
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Marela'),
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Passayah'),
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Songoyah'),
  ((SELECT id FROM communes WHERE code = 'FAR'), 'Tiro');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'DIN'), 'Dinguiraye-Centre'),
  ((SELECT id FROM communes WHERE code = 'DIN'), 'Banora'),
  ((SELECT id FROM communes WHERE code = 'DIN'), 'Dialakoro'),
  ((SELECT id FROM communes WHERE code = 'DIN'), 'Diatiféré'),
  ((SELECT id FROM communes WHERE code = 'DIN'), 'Gagnakali'),
  ((SELECT id FROM communes WHERE code = 'DIN'), 'Kalinko'),
  ((SELECT id FROM communes WHERE code = 'DIN'), 'Lansanaya'),
  ((SELECT id FROM communes WHERE code = 'DIN'), 'Selouma');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'DAB'), 'Dabola-Centre'),
  ((SELECT id FROM communes WHERE code = 'DAB'), 'Arfamoussaya'),
  ((SELECT id FROM communes WHERE code = 'DAB'), 'Banko'),
  ((SELECT id FROM communes WHERE code = 'DAB'), 'Bishikirima'),
  ((SELECT id FROM communes WHERE code = 'DAB'), 'Dogomet'),
  ((SELECT id FROM communes WHERE code = 'DAB'), 'Kankama'),
  ((SELECT id FROM communes WHERE code = 'DAB'), 'Kindoye'),
  ((SELECT id FROM communes WHERE code = 'DAB'), 'Konendou'),
  ((SELECT id FROM communes WHERE code = 'DAB'), 'N''Déma');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Kissidougou-Centre'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Albadariah'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Banama'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Bardou'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Beindou'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Fermessadou-Pombo'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Firawa'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Gbangbadou'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Kondiadou'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Manfran'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Sangardo'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Yendé-Millimou'),
  ((SELECT id FROM communes WHERE code = 'KIS'), 'Yombiro');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Kankan-Centre'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Balandou'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Baté-Nafadji'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Boula'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Gbérédou-Baranama'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Karifamoriya'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Koumban'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Mamouroudou'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Missamana'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Moribayah'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Sabadou-Baranama'),
  ((SELECT id FROM communes WHERE code = 'KAN'), 'Tokounou');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'KER'), 'Kérouané-Centre'),
  ((SELECT id FROM communes WHERE code = 'KER'), 'Banankoro'),
  ((SELECT id FROM communes WHERE code = 'KER'), 'Damaro'),
  ((SELECT id FROM communes WHERE code = 'KER'), 'Komodou'),
  ((SELECT id FROM communes WHERE code = 'KER'), 'Kounsankoro'),
  ((SELECT id FROM communes WHERE code = 'KER'), 'Linko'),
  ((SELECT id FROM communes WHERE code = 'KER'), 'Sibiribaro'),
  ((SELECT id FROM communes WHERE code = 'KER'), 'Soromaya');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Kouroussa-Centre'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Babila'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Balato'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Banfélé'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Baro'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Cisséla'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Douako'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Doura'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Komola-Koura'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Koumana'),
  ((SELECT id FROM communes WHERE code = 'KRS'), 'Sanguiana');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'MND'), 'Mandiana-Centre'),
  ((SELECT id FROM communes WHERE code = 'MND'), 'Dialakoro'),
  ((SELECT id FROM communes WHERE code = 'MND'), 'Faralako'),
  ((SELECT id FROM communes WHERE code = 'MND'), 'Koundian'),
  ((SELECT id FROM communes WHERE code = 'MND'), 'Koundianakoro'),
  ((SELECT id FROM communes WHERE code = 'MND'), 'Morodou'),
  ((SELECT id FROM communes WHERE code = 'MND'), 'Niantanina'),
  ((SELECT id FROM communes WHERE code = 'MND'), 'Salatou'),
  ((SELECT id FROM communes WHERE code = 'MND'), 'Saladou');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Siguiri-Centre'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Bankon'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Doko'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Franwalia'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Kiniebakora'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Kintinian'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Malea'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Naboun'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Niagassola'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Niandankoro'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Norassoba'),
  ((SELECT id FROM communes WHERE code = 'SIG'), 'Siguirini');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'NZR'), 'N''Zérékoré-Centre'),
  ((SELECT id FROM communes WHERE code = 'NZR'), 'Bounouma'),
  ((SELECT id FROM communes WHERE code = 'NZR'), 'Gouécké'),
  ((SELECT id FROM communes WHERE code = 'NZR'), 'Kobela'),
  ((SELECT id FROM communes WHERE code = 'NZR'), 'Koropara'),
  ((SELECT id FROM communes WHERE code = 'NZR'), 'Koulé'),
  ((SELECT id FROM communes WHERE code = 'NZR'), 'Palé'),
  ((SELECT id FROM communes WHERE code = 'NZR'), 'Samoé'),
  ((SELECT id FROM communes WHERE code = 'NZR'), 'Yalenzou');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Beyla-Centre'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Boola'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Diassodou'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Fouala'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Gbakoredou'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Gbessoba'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Karala'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Koumandou'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'N''Zoo'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Sinkko'),
  ((SELECT id FROM communes WHERE code = 'BEY'), 'Sokourala');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'GCK'), 'Guéckédou-Centre'),
  ((SELECT id FROM communes WHERE code = 'GCK'), 'Bolodou'),
  ((SELECT id FROM communes WHERE code = 'GCK'), 'Fangamadou'),
  ((SELECT id FROM communes WHERE code = 'GCK'), 'Guendembou'),
  ((SELECT id FROM communes WHERE code = 'GCK'), 'Kassadou'),
  ((SELECT id FROM communes WHERE code = 'GCK'), 'Koundou'),
  ((SELECT id FROM communes WHERE code = 'GCK'), 'N''Gendembou'),
  ((SELECT id FROM communes WHERE code = 'GCK'), 'Ouéndé-Kénéma'),
  ((SELECT id FROM communes WHERE code = 'GCK'), 'Tékoró');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'LOL'), 'Lola-Centre'),
  ((SELECT id FROM communes WHERE code = 'LOL'), 'Bossou'),
  ((SELECT id FROM communes WHERE code = 'LOL'), 'Foumbadou'),
  ((SELECT id FROM communes WHERE code = 'LOL'), 'Gama-Béréma'),
  ((SELECT id FROM communes WHERE code = 'LOL'), 'Guéassou'),
  ((SELECT id FROM communes WHERE code = 'LOL'), 'Kokota'),
  ((SELECT id FROM communes WHERE code = 'LOL'), 'Lain'),
  ((SELECT id FROM communes WHERE code = 'LOL'), 'Tounkarata');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Macenta-Centre'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Balizia'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Binikala'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Bofossou'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Daro'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Fassankoni'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Kouankan'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Koyama'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'N''Zébela'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Ourémai'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Pantheron'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Serédou'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Vasérédou'),
  ((SELECT id FROM communes WHERE code = 'MAC'), 'Watanka');
INSERT OR IGNORE INTO localites (commune_id, nom) VALUES
  ((SELECT id FROM communes WHERE code = 'YOM'), 'Yomou-Centre'),
  ((SELECT id FROM communes WHERE code = 'YOM'), 'Bignamou'),
  ((SELECT id FROM communes WHERE code = 'YOM'), 'Bowé'),
  ((SELECT id FROM communes WHERE code = 'YOM'), 'Diécké'),
  ((SELECT id FROM communes WHERE code = 'YOM'), 'Banié'),
  ((SELECT id FROM communes WHERE code = 'YOM'), 'Péla');
