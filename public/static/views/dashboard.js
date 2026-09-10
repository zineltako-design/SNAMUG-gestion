import { API } from '../api.js'
import { store } from '../store.js'
import { formatMoney, formatDateTime, badgeStatutCotisation, typeLabel, modeLabel } from '../utils.js'
import { isOnline } from '../offline/connectivity.js'
import { cacheGetAll, STORES, queueCount } from '../offline/db.js'

function statCard(icon, label, value, color) {
  return `
    <div class="card p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl text-white" style="background:${color}">
        <i class="fas ${icon}"></i>
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-800">${value}</div>
        <div class="text-sm text-gray-500">${label}</div>
      </div>
    </div>
  `
}

export async function renderDashboardNational() {
  const { data } = await API.get('/dashboard/national')
  const { globalStats, parCommune, dernieresOperations, annee } = data

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-800">Vue d'ensemble nationale — ${annee}</h1>
        <span class="text-sm text-gray-500"><i class="fas fa-sync-alt mr-1"></i>Supervision en temps réel des 13 communes</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${statCard('fa-map-marker-alt', 'Communes actives', globalStats.total_communes, 'var(--snamug-bleu)')}
        ${statCard('fa-users', 'Membres actifs', globalStats.total_membres, 'var(--snamug-vert)')}
        ${statCard('fa-hand-holding-usd', 'Recettes ' + annee, formatMoney(globalStats.total_recettes_annee), 'var(--snamug-jaune)')}
        ${statCard('fa-file-invoice-dollar', 'Dépenses ' + annee, formatMoney(globalStats.total_depenses_annee), 'var(--snamug-rouge)')}
      </div>

      <div class="card p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-map-marker-alt mr-2 text-gray-400"></i>Situation par commune</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Commune</th>
                <th class="py-2 pr-4">Membres actifs</th>
                <th class="py-2 pr-4">Recettes ${annee}</th>
                <th class="py-2 pr-4">Dépenses ${annee}</th>
                <th class="py-2 pr-4">Solde</th>
              </tr>
            </thead>
            <tbody>
              ${parCommune.map(c => `
                <tr class="border-b last:border-0 hover:bg-gray-50">
                  <td class="py-2 pr-4 font-medium">${c.nom} <span class="text-gray-400">(${c.code})</span></td>
                  <td class="py-2 pr-4">${c.nb_membres}</td>
                  <td class="py-2 pr-4 text-green-700">${formatMoney(c.recettes)}</td>
                  <td class="py-2 pr-4 text-red-700">${formatMoney(c.depenses)}</td>
                  <td class="py-2 pr-4 font-semibold">${formatMoney(c.recettes - c.depenses)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="py-4 text-center text-gray-400">Aucune commune</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-clock mr-2 text-gray-400"></i>Dernières opérations</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Date</th>
                <th class="py-2 pr-4">Commune</th>
                <th class="py-2 pr-4">Membre</th>
                <th class="py-2 pr-4">Type</th>
                <th class="py-2 pr-4">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${dernieresOperations.map(op => `
                <tr class="border-b last:border-0 hover:bg-gray-50">
                  <td class="py-2 pr-4 text-gray-500">${formatDateTime(op.created_at)}</td>
                  <td class="py-2 pr-4">${op.commune_nom}</td>
                  <td class="py-2 pr-4">${op.membre_prenom} ${op.membre_nom}</td>
                  <td class="py-2 pr-4">${typeLabel(op.type)}</td>
                  <td class="py-2 pr-4 font-medium">${formatMoney(op.montant)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="py-4 text-center text-gray-400">Aucune opération récente</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

async function computeStatsOffline() {
  const annee = new Date().getFullYear()
  const membres = await cacheGetAll(STORES.MEMBRES)
  const paiements = await cacheGetAll(STORES.PAIEMENTS)
  const depenses = await cacheGetAll(STORES.DEPENSES)

  const membresActifs = membres.filter((m) => m.statut === 'actif')
  const membresAJour = new Set(
    paiements.filter((p) => p.type === 'cotisation' && String(p.periode_annee) === String(annee)).map((p) => p.membre_id)
  )
  const membresEnRetard = membresActifs.filter((m) => !membresAJour.has(m.id)).length

  const totalRecettes = paiements
    .filter((p) => String(p.periode_annee) === String(annee))
    .reduce((sum, p) => sum + Number(p.montant), 0)
  const totalDepenses = depenses
    .filter((d) => (d.date_depense || '').startsWith(String(annee)))
    .reduce((sum, d) => sum + Number(d.montant), 0)

  const dernieresOperations = paiements
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 15)

  return {
    stats: {
      total_membres: membresActifs.length,
      membres_en_retard: membresEnRetard,
      total_recettes_annee: totalRecettes,
      total_depenses_annee: totalDepenses
    },
    dernieresOperations,
    annee
  }
}

export async function renderDashboardCommune() {
  let data
  let hors_ligne = false

  if (isOnline()) {
    try {
      const res = await API.get('/dashboard/commune')
      data = res.data
    } catch (e) {
      data = await computeStatsOffline()
      hors_ligne = true
    }
  } else {
    data = await computeStatsOffline()
    hors_ligne = true
  }

  const { stats, dernieresOperations, annee } = data
  const nbEnAttente = await queueCount()

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-800">Vue d'ensemble — ${store.commune?.nom || ''}</h1>
        <span class="text-sm text-gray-500">Exercice ${annee}</span>
      </div>

      ${hors_ligne ? `<div class="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"><i class="fas fa-database mr-1"></i>Statistiques calculées à partir des données locales (hors-ligne)${nbEnAttente > 0 ? ` — ${nbEnAttente} opération(s) en attente de synchronisation` : ''}.</div>` : ''}

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${statCard('fa-users', 'Membres actifs', stats.total_membres, 'var(--snamug-bleu)')}
        ${statCard('fa-exclamation-triangle', 'Membres en retard', stats.membres_en_retard, 'var(--snamug-rouge)')}
        ${statCard('fa-hand-holding-usd', 'Recettes ' + annee, formatMoney(stats.total_recettes_annee), 'var(--snamug-vert)')}
        ${statCard('fa-file-invoice-dollar', 'Dépenses ' + annee, formatMoney(stats.total_depenses_annee), 'var(--snamug-jaune)')}
      </div>

      <div class="flex gap-3 flex-wrap">
        <a href="#/membres" class="btn-primary rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <i class="fas fa-user-plus"></i> Inscrire un membre
        </a>
        <a href="#/paiements" class="btn-success rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <i class="fas fa-cash-register"></i> Enregistrer un paiement
        </a>
        <a href="#/depenses" class="btn-danger rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <i class="fas fa-receipt"></i> Saisir une dépense
        </a>
      </div>

      <div class="card p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-clock mr-2 text-gray-400"></i>Dernières opérations</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Date</th>
                <th class="py-2 pr-4">Membre</th>
                <th class="py-2 pr-4">Type</th>
                <th class="py-2 pr-4">Mode</th>
                <th class="py-2 pr-4">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${dernieresOperations.map(op => `
                <tr class="border-b last:border-0 hover:bg-gray-50">
                  <td class="py-2 pr-4 text-gray-500">${formatDateTime(op.created_at)}</td>
                  <td class="py-2 pr-4">${op.membre_prenom} ${op.membre_nom}</td>
                  <td class="py-2 pr-4">${typeLabel(op.type)}</td>
                  <td class="py-2 pr-4">${modeLabel(op.mode_paiement)}</td>
                  <td class="py-2 pr-4 font-medium">${formatMoney(op.montant)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="py-4 text-center text-gray-400">Aucune opération récente</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

export async function renderDashboardMembre() {
  const { data } = await API.get('/dashboard/membre')
  const { membre, statut_cotisation, annee, historique } = data

  return `
    <div class="space-y-6">
      <div class="card p-6 snamug-gradient text-white">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div class="text-sm text-white/70">Carte de membre</div>
            <h1 class="text-2xl font-bold">${membre.prenom} ${membre.nom}</h1>
            <div class="text-white/80 text-sm mt-1">${membre.numero_adhesion}</div>
            <div class="text-white/80 text-sm">${membre.discipline || ''}</div>
          </div>
          <div class="text-right">
            <div class="text-sm text-white/70 mb-1">Statut cotisation ${annee}</div>
            ${badgeStatutCotisation(statut_cotisation)}
          </div>
        </div>
      </div>

      <div class="card p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-history mr-2 text-gray-400"></i>Historique de mes paiements</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Date</th>
                <th class="py-2 pr-4">Type</th>
                <th class="py-2 pr-4">Montant</th>
                <th class="py-2 pr-4">Mode</th>
                <th class="py-2 pr-4">Reçu</th>
              </tr>
            </thead>
            <tbody>
              ${historique.map(p => `
                <tr class="border-b last:border-0 hover:bg-gray-50">
                  <td class="py-2 pr-4">${p.date_paiement}</td>
                  <td class="py-2 pr-4">${typeLabel(p.type)}</td>
                  <td class="py-2 pr-4 font-medium">${formatMoney(p.montant)}</td>
                  <td class="py-2 pr-4">${modeLabel(p.mode_paiement)}</td>
                  <td class="py-2 pr-4 text-blue-600 font-mono text-xs">${p.numero_recu}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="py-4 text-center text-gray-400">Aucun paiement enregistré</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}
