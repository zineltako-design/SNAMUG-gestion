import { API, apiErrorMessage } from '../api.js'
import { formatMoney, formatDate, toast, openModal, closeModal, escapeHtml } from '../utils.js'

function badgeStatutProjet(statut) {
  const map = {
    actif: '<span class="badge-vert px-2 py-1 rounded text-xs font-semibold">Actif</span>',
    cloture: '<span class="badge-bleu px-2 py-1 rounded text-xs font-semibold">Clôturé</span>',
    suspendu: '<span class="badge-jaune px-2 py-1 rounded text-xs font-semibold">Suspendu</span>'
  }
  return map[statut] || statut
}

function barreExecution(taux) {
  const t = Math.min(100, Math.max(0, Number(taux) || 0))
  const color = t >= 90 ? 'var(--snamug-rouge)' : t >= 70 ? 'var(--snamug-jaune)' : 'var(--snamug-vert)'
  return `
    <div class="w-full bg-gray-100 rounded-full h-2.5">
      <div class="h-2.5 rounded-full" style="width:${t}%; background:${color};"></div>
    </div>
    <div class="text-xs text-gray-500 mt-0.5">${t}% exécuté</div>
  `
}

export async function renderProjets() {
  const { data } = await API.get('/projets')
  const projets = data.projets

  setTimeout(() => attachHandlers(), 0)

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-800">Projets & Budgets</h1>
        <button id="btn-new-projet" class="btn-primary rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <i class="fas fa-plus"></i> Nouveau projet
        </button>
      </div>
      <p class="text-sm text-gray-500">Suivi des projets financés par des bailleurs : lignes budgétaires codifiées, imputation des dépenses, taux d'exécution.</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${projets.map(p => `
          <div class="card p-4 space-y-2 cursor-pointer hover:shadow-md transition-shadow btn-view-projet" data-id="${p.id}">
            <div class="flex items-start justify-between">
              <div>
                <div class="font-bold text-gray-800">${escapeHtml(p.nom)}</div>
                <div class="text-xs text-gray-500"><i class="fas fa-hand-holding-usd mr-1"></i>${escapeHtml(p.bailleur)}</div>
              </div>
              ${badgeStatutProjet(p.statut)}
            </div>
            <div class="text-sm text-gray-700 font-medium">${formatMoney(p.montant_total)} <span class="text-xs text-gray-400">(${escapeHtml(p.devise)})</span></div>
            ${barreExecution(p.taux_execution)}
            <div class="text-xs text-gray-400 flex justify-between pt-1 border-t mt-1">
              <span>${formatDate(p.date_debut)} → ${formatDate(p.date_fin)}</span>
              <span class="text-blue-600">Détails <i class="fas fa-chevron-right"></i></span>
            </div>
          </div>
        `).join('') || '<div class="text-gray-400 col-span-full text-center py-10"><i class="fas fa-folder-open text-3xl mb-2"></i><br/>Aucun projet enregistré</div>'}
      </div>
    </div>
  `
}

function attachHandlers() {
  document.getElementById('btn-new-projet')?.addEventListener('click', () => openProjetModal())
  document.querySelectorAll('.btn-view-projet').forEach(el => {
    el.addEventListener('click', () => openProjetDetail(el.dataset.id))
  })
}

function openProjetModal(projet = null) {
  const isEdit = !!projet
  openModal(`
    <div class="p-6">
      <h2 class="text-lg font-bold text-gray-800 mb-4">${isEdit ? 'Modifier le projet' : 'Nouveau projet'}</h2>
      <form id="form-projet" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nom du projet *</label>
          <input required name="nom" value="${escapeHtml(projet?.nom || '')}" class="w-full border rounded-lg px-3 py-2" placeholder="ex: Appui à la formation des artistes 2026" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bailleur *</label>
          <input required name="bailleur" value="${escapeHtml(projet?.bailleur || '')}" class="w-full border rounded-lg px-3 py-2" placeholder="ex: UNESCO, Union Européenne..." />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Montant total *</label>
            <input required type="number" min="0" step="1000" name="montant_total" value="${projet?.montant_total || ''}" class="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Devise</label>
            <select name="devise" class="w-full border rounded-lg px-3 py-2">
              <option value="GNF" ${!projet || projet.devise === 'GNF' ? 'selected' : ''}>GNF</option>
              <option value="USD" ${projet?.devise === 'USD' ? 'selected' : ''}>USD</option>
              <option value="EUR" ${projet?.devise === 'EUR' ? 'selected' : ''}>EUR</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <input type="date" name="date_debut" value="${projet?.date_debut || ''}" class="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
            <input type="date" name="date_fin" value="${projet?.date_fin || ''}" class="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        ${isEdit ? `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select name="statut" class="w-full border rounded-lg px-3 py-2">
            <option value="actif" ${projet.statut === 'actif' ? 'selected' : ''}>Actif</option>
            <option value="suspendu" ${projet.statut === 'suspendu' ? 'selected' : ''}>Suspendu</option>
            <option value="cloture" ${projet.statut === 'cloture' ? 'selected' : ''}>Clôturé</option>
          </select>
        </div>` : ''}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" rows="2" class="w-full border rounded-lg px-3 py-2">${escapeHtml(projet?.description || '')}</textarea>
        </div>
        <div id="projet-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="btn-cancel-projet" class="px-4 py-2 rounded-lg border text-gray-600">Annuler</button>
          <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-semibold">${isEdit ? 'Enregistrer' : 'Créer le projet'}</button>
        </div>
      </form>
    </div>
  `)

  document.getElementById('btn-cancel-projet').addEventListener('click', closeModal)
  document.getElementById('form-projet').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = Object.fromEntries(fd.entries())
    payload.montant_total = Number(payload.montant_total)

    try {
      if (isEdit) {
        await API.put(`/projets/${projet.id}`, payload)
        closeModal()
        toast('Projet mis à jour', 'success')
        openProjetDetail(projet.id)
      } else {
        await API.post('/projets', payload)
        closeModal()
        toast('Projet créé', 'success')
        renderProjets().then(html => {
          document.getElementById('page-content').innerHTML = html
          attachHandlers()
        })
      }
    } catch (err) {
      const errorBox = document.getElementById('projet-error')
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
    }
  })
}

async function openProjetDetail(id) {
  const { data } = await API.get(`/projets/${id}`)
  const { projet, lignes_budgetaires, depenses } = data

  const contentEl = document.getElementById('page-content')
  contentEl.innerHTML = renderDetailHtml(projet, lignes_budgetaires, depenses)
  attachDetailHandlers(projet, lignes_budgetaires)
}

function renderLigneRow(ligne, depth = 0) {
  const indent = depth * 20
  const rows = [`
    <tr class="border-b last:border-0 hover:bg-gray-50">
      <td class="py-2 px-4"><span style="padding-left:${indent}px" class="font-mono text-xs text-gray-500">${escapeHtml(ligne.code)}</span></td>
      <td class="py-2 px-4 font-medium">${escapeHtml(ligne.libelle)}</td>
      <td class="py-2 px-4">${formatMoney(ligne.montant_alloue)}</td>
      <td class="py-2 px-4 text-red-700">${formatMoney(ligne.montant_depense)}</td>
      <td class="py-2 px-4 w-40">${barreExecution(ligne.taux_execution)}</td>
      <td class="py-2 px-4">
        <button class="text-blue-600 hover:underline text-xs btn-add-sousligne mr-2" data-parent="${ligne.id}" data-code="${escapeHtml(ligne.code)}"><i class="fas fa-plus"></i> Sous-ligne</button>
        <button class="text-gray-500 hover:underline text-xs btn-edit-ligne" data-id="${ligne.id}" data-code="${escapeHtml(ligne.code)}" data-libelle="${escapeHtml(ligne.libelle)}" data-montant="${ligne.montant_alloue}"><i class="fas fa-edit"></i></button>
      </td>
    </tr>
  `]
  for (const enfant of (ligne.enfants || [])) {
    rows.push(renderLigneRow(enfant, depth + 1))
  }
  return rows.join('')
}

function renderDetailHtml(projet, lignes, depenses) {
  return `
    <div class="space-y-4">
      <button id="btn-back-projets" class="text-sm text-blue-600 hover:underline"><i class="fas fa-arrow-left mr-1"></i> Retour aux projets</button>

      <div class="card p-5 space-y-2">
        <div class="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 class="text-2xl font-bold text-gray-800">${escapeHtml(projet.nom)}</h1>
            <div class="text-sm text-gray-500"><i class="fas fa-hand-holding-usd mr-1"></i>${escapeHtml(projet.bailleur)} — ${badgeStatutProjet(projet.statut)}</div>
          </div>
          <button id="btn-edit-projet" class="text-sm px-3 py-1.5 rounded-lg border text-gray-600"><i class="fas fa-edit mr-1"></i> Modifier</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <div class="text-xs text-gray-500">Budget total</div>
            <div class="text-lg font-bold text-gray-800">${formatMoney(projet.montant_total)}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Budgétisé (lignes)</div>
            <div class="text-lg font-bold text-blue-700">${formatMoney(projet.montant_budgetise)}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Dépensé</div>
            <div class="text-lg font-bold text-red-700">${formatMoney(projet.montant_depense)}</div>
          </div>
        </div>
        <div class="pt-1">${barreExecution(projet.taux_execution_global)}</div>
        ${projet.description ? `<p class="text-sm text-gray-600 pt-2 border-t mt-2">${escapeHtml(projet.description)}</p>` : ''}
      </div>

      <div class="card p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-gray-800"><i class="fas fa-sitemap mr-2 text-blue-600"></i>Lignes budgétaires</h2>
          <button id="btn-add-ligne-racine" class="text-sm px-3 py-1.5 rounded-lg btn-primary"><i class="fas fa-plus mr-1"></i> Rubrique</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b bg-gray-50">
                <th class="py-2 px-4">Code</th>
                <th class="py-2 px-4">Libellé</th>
                <th class="py-2 px-4">Alloué</th>
                <th class="py-2 px-4">Dépensé</th>
                <th class="py-2 px-4">Exécution</th>
                <th class="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              ${lignes.map(l => renderLigneRow(l)).join('') || `<tr><td colspan="6" class="py-6 text-center text-gray-400">Aucune ligne budgétaire — ajoutez une rubrique pour structurer le budget</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card p-4">
        <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-receipt mr-2 text-red-600"></i>Dépenses imputées</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b bg-gray-50">
                <th class="py-2 px-4">Date</th>
                <th class="py-2 px-4">Libellé</th>
                <th class="py-2 px-4">Ligne</th>
                <th class="py-2 px-4">Commune</th>
                <th class="py-2 px-4">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${(depenses || []).map(d => `
                <tr class="border-b last:border-0">
                  <td class="py-2 px-4">${formatDate(d.date_depense)}</td>
                  <td class="py-2 px-4">${escapeHtml(d.libelle)}</td>
                  <td class="py-2 px-4 text-xs text-gray-500">${d.ligne_code ? escapeHtml(d.ligne_code) + ' — ' + escapeHtml(d.ligne_libelle) : '-'}</td>
                  <td class="py-2 px-4">${escapeHtml(d.commune_nom) || '-'}</td>
                  <td class="py-2 px-4 font-medium text-red-700">${formatMoney(d.montant)}</td>
                </tr>
              `).join('') || `<tr><td colspan="5" class="py-6 text-center text-gray-400">Aucune dépense imputée à ce projet</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

function attachDetailHandlers(projet, lignes) {
  document.getElementById('btn-back-projets').addEventListener('click', () => {
    renderProjets().then(html => {
      document.getElementById('page-content').innerHTML = html
      attachHandlers()
    })
  })
  document.getElementById('btn-edit-projet').addEventListener('click', () => openProjetModal(projet))
  document.getElementById('btn-add-ligne-racine').addEventListener('click', () => openLigneModal(projet.id, null, null))
  document.querySelectorAll('.btn-add-sousligne').forEach(btn => {
    btn.addEventListener('click', () => openLigneModal(projet.id, btn.dataset.parent, btn.dataset.code))
  })
  document.querySelectorAll('.btn-edit-ligne').forEach(btn => {
    btn.addEventListener('click', () => openLigneModal(projet.id, null, null, {
      id: btn.dataset.id, code: btn.dataset.code, libelle: btn.dataset.libelle, montant_alloue: btn.dataset.montant
    }))
  })
}

function openLigneModal(projetId, parentId, parentCode, ligne = null) {
  const isEdit = !!ligne
  openModal(`
    <div class="p-6">
      <h2 class="text-lg font-bold text-gray-800 mb-4">${isEdit ? 'Modifier la ligne budgétaire' : (parentId ? `Nouvelle sous-ligne de ${escapeHtml(parentCode)}` : 'Nouvelle rubrique budgétaire')}</h2>
      <form id="form-ligne" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Code *</label>
          <input required name="code" value="${escapeHtml(ligne?.code || '')}" class="w-full border rounded-lg px-3 py-2" placeholder="ex: 1, 1.1, 1.1.1" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Libellé *</label>
          <input required name="libelle" value="${escapeHtml(ligne?.libelle || '')}" class="w-full border rounded-lg px-3 py-2" placeholder="ex: Formation des formateurs" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Montant alloué *</label>
          <input required type="number" min="0" step="1000" name="montant_alloue" value="${ligne?.montant_alloue || ''}" class="w-full border rounded-lg px-3 py-2" />
        </div>
        <div id="ligne-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="btn-cancel-ligne" class="px-4 py-2 rounded-lg border text-gray-600">Annuler</button>
          <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-semibold">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    </div>
  `)

  document.getElementById('btn-cancel-ligne').addEventListener('click', closeModal)
  document.getElementById('form-ligne').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = Object.fromEntries(fd.entries())
    payload.montant_alloue = Number(payload.montant_alloue)
    if (!isEdit) payload.parent_id = parentId || null

    try {
      if (isEdit) {
        await API.put(`/projets/${projetId}/lignes/${ligne.id}`, payload)
      } else {
        await API.post(`/projets/${projetId}/lignes`, payload)
      }
      closeModal()
      toast(isEdit ? 'Ligne budgétaire mise à jour' : 'Ligne budgétaire créée', 'success')
      openProjetDetail(projetId)
    } catch (err) {
      const errorBox = document.getElementById('ligne-error')
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
    }
  })
}
