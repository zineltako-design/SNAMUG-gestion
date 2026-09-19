// Types partagés pour SNAMUG GESTION

export type Bindings = {
  DB: D1Database
  R2: R2Bucket
  JWT_SECRET?: string
}

export type Role = 'membre' | 'comptable' | 'secretaire'

export interface JwtPayload {
  sub: number // user id
  role: Role
  commune_id: number | null
  nom: string
  prenom: string
  exp: number
  iat: number
}

export interface Commune {
  id: number
  nom: string
  code: string
  region: string | null
  actif: number
  created_at: string
}

export interface Localite {
  id: number
  commune_id: number
  nom: string
  created_at: string
}

export interface User {
  id: number
  email: string | null
  telephone: string | null
  password_hash: string
  password_salt: string
  role: Role
  commune_id: number | null
  nom: string
  prenom: string
  actif: number
  doit_changer_mdp: number
  derniere_connexion: string | null
  created_at: string
}

export interface Membre {
  id: number
  user_id: number | null
  numero_adhesion: string
  commune_id: number
  nom: string
  prenom: string
  telephone: string | null
  email: string | null
  sexe: 'M' | 'F' | null
  date_naissance: string | null
  discipline: string | null
  adresse: string | null
  photo_url: string | null
  date_adhesion: string
  statut: 'actif' | 'suspendu' | 'radie'
  saisi_par: number | null
  created_at: string
}

export interface Paiement {
  id: number
  numero_recu: string
  membre_id: number
  commune_id: number
  type: 'adhesion' | 'cotisation' | 'don'
  montant: number
  mode_paiement: 'especes' | 'orange_money'
  reference_paiement: string | null
  periode_annee: number
  periode_mois: number | null
  date_paiement: string
  commentaire: string | null
  statut: 'en_attente' | 'valide' | 'rejete'
  saisi_par: number
  valide_par: number | null
  valide_at: string | null
  created_at: string
}
