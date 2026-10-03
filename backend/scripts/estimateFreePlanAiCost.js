import { config as loadDotEnv } from 'dotenv'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { AI_FEATURES, PLANS } from '../src/config/plans.js'
import { AI_SETTINGS, aiOutputLimit } from '../src/config/ai.js'

const backendRoot = resolve(import.meta.dirname, '..')
loadDotEnv({ path: resolve(backendRoot, '.env'), quiet: true })

// Baselines are deliberately editable. Only job_analysis has a real usage
// sample; the remaining rows are estimates derived from compact production
// payloads and typical outputs (roughly 4 characters/token). Reasoning tokens
// are a subset of output_tokens and must not be added to billed output again.
export const TOKEN_METRICS = Object.freeze({
  [AI_FEATURES.JOB_ANALYSIS]: {
    label: 'Analyse d’offre', model: 'configured', callsPerAction: 1,
    source: 'observed', inputTokens: 963, outputTokens: 829, reasoningTokens: 244,
  },
  [AI_FEATURES.COVER_LETTER_GENERATION]: {
    label: 'Génération de lettre', model: 'configured', callsPerAction: 1,
    source: 'estimated', inputTokens: 1700, outputTokens: 550, reasoningTokens: 95,
  },
  [AI_FEATURES.CV_ADAPTATION]: {
    label: 'Adaptation de CV (Pro uniquement)', model: 'configured', callsPerAction: 1,
    source: 'estimated', inputTokens: 3200, outputTokens: 550, reasoningTokens: 95,
  },
  [AI_FEATURES.APPLICATION_FOLLOWUP]: {
    label: 'Relance de candidature', model: 'configured', callsPerAction: 1,
    source: 'estimated', inputTokens: 250, outputTokens: 150, reasoningTokens: 25,
  },
  [AI_FEATURES.INTERVIEW_PREPARATION]: {
    label: 'Préparation entretien', model: 'configured', callsPerAction: 1,
    source: 'estimated', inputTokens: 1750, outputTokens: 700, reasoningTokens: 110,
  },
  [AI_FEATURES.INTERVIEW_SIMULATION]: {
    label: 'Simulation entretien', model: 'configured', callsPerAction: 1,
    source: 'estimated', stages: {
      start: { inputTokens: 1100, outputTokens: 140, reasoningTokens: 25 },
      answer: { inputTokens: 1320, outputTokens: 250, reasoningTokens: 45 },
      answerPro: { inputTokens: 1350, outputTokens: 340, reasoningTokens: 55 },
    },
  },
  [AI_FEATURES.RESUME_SUMMARY]: {
    label: 'Résumé professionnel (génération / reformulation, quota partagé)', model: 'configured', callsPerAction: 1,
    source: 'estimated', variants: {
      generate: { inputTokens: 850, outputTokens: 150, reasoningTokens: 25 },
      rewrite: { inputTokens: 220, outputTokens: 150, reasoningTokens: 25 },
    },
  },
  [AI_FEATURES.EXPERIENCE_REWRITE]: {
    label: 'Reformulation d’expérience', model: 'configured', callsPerAction: 1,
    source: 'estimated', inputTokens: 400, outputTokens: 200, reasoningTokens: 30,
  },
})

export const DEFAULT_PRICES = Object.freeze({
  model: 'gpt-6-luna',
  inputPricePerMillion: 0.10,
  cachedInputPricePerMillion: 0.01,
  outputPricePerMillion: 0.50,
  source: 'OpenAI GPT-6 Luna Standard, short context',
})

export function resolvePrices(env = process.env) {
  const model = env.OPENAI_MODEL || 'gpt-6-luna'
  const hasInputPrice = env.FREE_AI_INPUT_PRICE_PER_MILLION !== undefined
  const hasOutputPrice = env.FREE_AI_OUTPUT_PRICE_PER_MILLION !== undefined
  if (model !== DEFAULT_PRICES.model && (!hasInputPrice || !hasOutputPrice)) {
    throw new Error(`OPENAI_MODEL=${model} is not covered by the default price table. Set FREE_AI_INPUT_PRICE_PER_MILLION and FREE_AI_OUTPUT_PRICE_PER_MILLION.`)
  }
  const prices = {
    model,
    inputPricePerMillion: hasInputPrice ? Number(env.FREE_AI_INPUT_PRICE_PER_MILLION) : DEFAULT_PRICES.inputPricePerMillion,
    cachedInputPricePerMillion: env.FREE_AI_CACHED_INPUT_PRICE_PER_MILLION === undefined ? DEFAULT_PRICES.cachedInputPricePerMillion : Number(env.FREE_AI_CACHED_INPUT_PRICE_PER_MILLION),
    outputPricePerMillion: hasOutputPrice ? Number(env.FREE_AI_OUTPUT_PRICE_PER_MILLION) : DEFAULT_PRICES.outputPricePerMillion,
    cachedInputShare: env.FREE_AI_CACHED_INPUT_SHARE === undefined ? 0 : Number(env.FREE_AI_CACHED_INPUT_SHARE),
    source: model === DEFAULT_PRICES.model ? DEFAULT_PRICES.source : 'user-configured prices',
  }
  if (![prices.inputPricePerMillion, prices.cachedInputPricePerMillion, prices.outputPricePerMillion].every((value) => Number.isFinite(value) && value >= 0)) throw new Error('Les prix Free AI doivent être des nombres positifs ou nuls.')
  if (!Number.isFinite(prices.cachedInputShare) || prices.cachedInputShare < 0 || prices.cachedInputShare > 1) throw new Error('FREE_AI_CACHED_INPUT_SHARE doit être compris entre 0 et 1.')
  return prices
}

export function quota(feature, plan = 'free') { return PLANS[plan]?.quotas[feature] || 0 }
export function maxOutputLabel(feature, plan = 'free') {
  const value = aiOutputLimit(feature, { plan })
  return [AI_FEATURES.JOB_ANALYSIS, AI_FEATURES.CV_ADAPTATION].includes(feature)
    ? `${value} (plafond OPENAI_MAX_OUTPUT_TOKENS)`
    : String(value)
}

export function callMetrics(feature, calls, { maximum = false, plan = 'free', bounded = false } = {}) {
  const metrics = TOKEN_METRICS[feature]
  if (!calls) return { calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0 }
  if (bounded) {
    const perCallOutput = aiOutputLimit(feature, { plan })
    return {
      calls,
      // UTF-8 request bytes are a conservative upper bound for byte-level
      // tokenization; framing allowance covers API role/message overhead.
      inputTokens: calls * (AI_SETTINGS[feature].maxRequestBytes + 256),
      outputTokens: calls * perCallOutput,
      reasoningTokens: calls * perCallOutput,
    }
  }
  if (metrics.stages) {
    const first = metrics.stages.start
    const followups = Math.max(0, calls - 1)
    const answer = plan === 'pro' ? metrics.stages.answerPro : metrics.stages.answer
    return {
      calls,
      inputTokens: first.inputTokens + followups * answer.inputTokens,
      outputTokens: first.outputTokens + followups * answer.outputTokens,
      reasoningTokens: first.reasoningTokens + followups * answer.reasoningTokens,
    }
  }
  if (metrics.variants) {
    const selected = maximum ? metrics.variants.generate : Object.fromEntries(
      Object.keys(metrics.variants.generate).map((key) => [key, (metrics.variants.generate[key] + metrics.variants.rewrite[key]) / 2]),
    )
    return { calls, inputTokens: calls * selected.inputTokens, outputTokens: calls * selected.outputTokens, reasoningTokens: calls * selected.reasoningTokens }
  }
  return { calls, inputTokens: calls * metrics.inputTokens, outputTokens: calls * metrics.outputTokens, reasoningTokens: calls * metrics.reasoningTokens }
}

export function priceTokens(tokens, prices) {
  const cachedShare = Math.min(1, Math.max(0, prices.cachedInputShare || 0))
  const inputRate = prices.inputPricePerMillion * (1 - cachedShare) + prices.cachedInputPricePerMillion * cachedShare
  const inputCost = tokens.inputTokens * inputRate / 1_000_000
  const outputCost = tokens.outputTokens * prices.outputPricePerMillion / 1_000_000
  return { inputCost, outputCost, totalCost: inputCost + outputCost }
}

export function buildScenario(fraction, prices, { maximum = false, plan = 'free', bounded = false } = {}) {
  const rows = Object.values(AI_FEATURES).map((feature) => {
    const limit = quota(feature, plan)
    const calls = maximum ? limit : Math.min(limit, Math.round(limit * fraction))
    const tokens = callMetrics(feature, calls, { maximum, plan, bounded })
    return { feature, label: TOKEN_METRICS[feature].label, quota: limit, ...tokens, ...priceTokens(tokens, prices) }
  })
  return rows.reduce((total, row) => ({
    rows: total.rows,
    calls: total.calls + row.calls,
    inputTokens: total.inputTokens + row.inputTokens,
    outputTokens: total.outputTokens + row.outputTokens,
    reasoningTokens: total.reasoningTokens + row.reasoningTokens,
    inputCost: total.inputCost + row.inputCost,
    outputCost: total.outputCost + row.outputCost,
    totalCost: total.totalCost + row.totalCost,
  }), { rows, calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, inputCost: 0, outputCost: 0, totalCost: 0 })
}

function money(value) { return `$${value.toFixed(8)}` }
function number(value) { return Math.round(value).toLocaleString('fr-FR') }

export function createReport({ prices = resolvePrices(), activeUsers = [10, 100, 1000, 10000] } = {}) {
  const scenarios = [
    { key: 'light', label: 'Léger (~25 %)', fraction: 0.25 },
    { key: 'average', label: 'Moyen (~60 %)', fraction: 0.60 },
    { key: 'intensive', label: 'Intensif (100 %)', fraction: 1 },
    ].map((scenario) => ({ ...scenario, ...buildScenario(scenario.fraction, prices) }))
  const maximum = buildScenario(1, prices, { maximum: true, bounded: true })
  const weightedMonthlyCost = scenarios.reduce((sum, scenario) => sum + scenario.totalCost * ({ light: 0.5, average: 0.35, intensive: 0.15 }[scenario.key]), 0)
  const costByQuota = Object.values(AI_FEATURES).map((feature) => {
    const row = maximum.rows.find((item) => item.feature === feature)
    const tokens = callMetrics(feature, row.quota, { maximum: true, bounded: true })
    const cost = priceTokens(tokens, prices).totalCost
    return { ...row, costPerCall: row.quota ? cost / row.quota : 0, fullQuotaCost: cost }
  }).sort((a, b) => b.fullQuotaCost - a.fullQuotaCost)

  return {
    prices,
    scenarios,
    maximum,
    weightedMonthlyCost,
    costByQuota,
    scale: activeUsers.map((count) => ({ count, worstCase: maximum.totalCost * count, realistic: weightedMonthlyCost * count })),
    interviewSessions: [
      { label: 'Courte (3 réponses évaluées)', calls: 4 },
      { label: 'Normale (5 réponses évaluées)', calls: 6 },
      { label: 'Maximum permis par Free dans le mois', calls: quota(AI_FEATURES.INTERVIEW_SIMULATION) },
    ].map((session) => ({ ...session, withinFreeMonthlyQuota: session.calls <= quota(AI_FEATURES.INTERVIEW_SIMULATION), ...callMetrics(AI_FEATURES.INTERVIEW_SIMULATION, session.calls), ...priceTokens(callMetrics(AI_FEATURES.INTERVIEW_SIMULATION, session.calls), prices) })),
  }
}

export function formatReport(report) {
  const lines = [
    '# Estimation mensuelle des coûts IA — Novyata Free',
    '',
    `Modèle configuré : ${report.prices.model} · Tarification utilisée : ${report.prices.source} · Input $${report.prices.inputPricePerMillion}/M · Input cache $${report.prices.cachedInputPricePerMillion}/M · Output $${report.prices.outputPricePerMillion}/M · part cache simulée ${Math.round((report.prices.cachedInputShare || 0) * 100)} %.`,
    'Les tokens de raisonnement sont inclus dans output_tokens : ils ne sont pas ajoutés une seconde fois au coût.',
    '',
    '## Fonctionnalités et coûts au quota maximal',
    '',
    '| Fonctionnalité / catégorie | Quota Free/mois | Appels/action | Modèle | Max output | Tokens par action input/output/raisonnement | Coût/appel de référence | Coût quota mensuel | Source |',
    '|---|---:|---:|---|---:|---:|---:|---:|---|',
  ]
  for (const item of report.costByQuota) {
    const details = TOKEN_METRICS[item.feature]
    const calls = item.quota
    const costPerCall = item.quota ? item.fullQuotaCost / item.quota : 0
    const average = calls ? `${number(item.inputTokens / calls)} / ${number(item.outputTokens / calls)} / ${number(item.reasoningTokens / calls)}` : '—'
    const model = report.prices.model
    const quotaText = item.feature === AI_FEATURES.APPLICATION_FOLLOWUP ? `${item.quota} (relance simple; remerciement Pro)` : item.feature === AI_FEATURES.CV_ADAPTATION ? '0 (Pro uniquement)' : item.feature === AI_FEATURES.RESUME_SUMMARY ? `${item.quota} partagé (génération + reformulation)` : item.feature === AI_FEATURES.INTERVIEW_SIMULATION ? `${item.quota} appels/tours` : String(item.quota)
    lines.push(`| ${details.label} | ${quotaText} | ${details.callsPerAction} | ${model} | ${maxOutputLabel(item.feature)} | ${average} | ${money(costPerCall)} | ${money(item.fullQuotaCost)} | ${details.source === 'observed' ? 'mesure réelle; coût au plafond' : 'estimation; coût au plafond'} |`)
  }
  lines.push('', 'Période : mois UTC (`YYYY-MM`). Le quota est réservé atomiquement côté serveur avant l’appel. Une erreur certaine avant dispatch libère la réservation; après dispatch, le quota reste consommé, car le fournisseur peut avoir facturé même si la sortie échoue. Quota épuisé = HTTP 429. Chaque action fait un seul appel Responses; aucun retry automatique. La simulation consomme une unité par démarrage ou envoi de réponse.', '', '## Simulation d’entretien', '', '| Scénario | Appels | Input estimé | Output estimé | Raisonnement (inclus dans output) | Coût estimé | Compatible avec quota Free mensuel ? |', '|---|---:|---:|---:|---:|---:|---|')
  for (const session of report.interviewSessions) lines.push(`| ${session.label} | ${session.calls} | ${number(session.inputTokens)} | ${number(session.outputTokens)} | ${number(session.reasoningTokens)} | ${money(session.totalCost)} | ${session.withinFreeMonthlyQuota ? 'oui' : 'non'} |`)
  lines.push('', 'Le contexte de simulation est reconstruit à chaque appel depuis le poste, le profil, le CV résumé, l’offre (plafonnée à 2 500 caractères), l’analyse et les notes. L’historique des échanges antérieurs n’est pas renvoyé : pas de croissance cumulative avec le nombre de tours. Pour 3 réponses entièrement évaluées, le code fait 4 appels (démarrage + 3 réponses). Pour 5 réponses, il faudrait 6 appels, alors que Free autorise 5 appels/mois : dans le meilleur cas un seul utilisateur consommant tout son quota peut obtenir 4 feedbacks et voir une 5e question en attente. Le quota est mensuel, pas par session.', '', '## Profils d’utilisation (arrondi au plus proche par catégorie)', '', '| Profil | Appels/mois estimés | Input | Output | Raisonnement (inclus dans output) | Total tokens (input + output) | Coût input | Coût output | Coût total |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|')
  for (const scenario of report.scenarios) lines.push(`| ${scenario.label} | ${number(scenario.calls)} | ${number(scenario.inputTokens)} | ${number(scenario.outputTokens)} | ${number(scenario.reasoningTokens)} | ${number(scenario.inputTokens + scenario.outputTokens)} | ${money(scenario.inputCost)} | ${money(scenario.outputCost)} | ${money(scenario.totalCost)} |`)
  const intensive = report.maximum
  lines.push('', `Enveloppe maximale Free par utilisateur : ${number(intensive.calls)} appels, ${number(intensive.inputTokens)} tokens d’entrée (borne conservatrice depuis les octets maximaux), ${number(intensive.outputTokens)} de sortie plafonnée dont ${number(intensive.reasoningTokens)} max de raisonnement, ${number(intensive.inputTokens + intensive.outputTokens)} tokens facturables; coût maximal simulé ${money(intensive.totalCost)} sans cache.`, '', `Répartition réaliste demandée (50 % légers, 35 % moyens, 15 % intensifs) : coût moyen estimé ${money(report.weightedMonthlyCost)} par utilisateur actif et par mois.`, '', '## Échelle mensuelle', '', '| Utilisateurs Free actifs | Tous intensifs (enveloppe max) | Répartition 50/35/15 |', '|---:|---:|---:|')
  for (const item of report.scale) lines.push(`| ${number(item.count)} | ${money(item.worstCase)} | ${money(item.realistic)} |`)
  lines.push('', '## Classement par coût au quota maximal', '', '| Rang | Fonctionnalité | Coût/appel moyen | Coût quota | Part du coût maximal Free |', '|---:|---|---:|---:|---:|')
  const totalFreeCost = intensive.totalCost
  report.costByQuota.filter((item) => item.quota > 0).forEach((item, index) => lines.push(`| ${index + 1} | ${item.label} | ${money(item.costPerCall)} | ${money(item.fullQuotaCost)} | ${((item.fullQuotaCost / totalFreeCost) * 100).toFixed(1)} % |`))
  lines.push('', '## Méthode et garde-fous', '', '- Analyse d’offre mesurée: 963 input, 829 output et 244 reasoning (reasoning inclus dans output). Les autres volumes d’usage typique sont des estimations, pas des prévisions garanties.', '- Les scénarios au quota maximum sont des enveloppes conservatrices: limite en octets UTF-8 par requête pour l’input, plafond `max_output_tokens` par action pour l’output, cache désactivé. Le reasoning est inclus dans l’output et n’est pas compté une deuxième fois.', '- Le client central applique un timeout, des plafonds explicites, la limite de taille et les drapeaux d’arrêt. Toutes les catégories OpenAI sont soumises à quotas mensuels côté serveur.', '- Protection contre la répétition et la concurrence: limiteur IA partagé de 20 requêtes/15 min/IP, rejet des requêtes identiques déjà en cours par instance, et réservation SQL atomique du quota. Aucun retry automatique.', '- Les échecs connus avant dispatch libèrent la réservation. Après dispatch, les erreurs ambiguës (timeout, provider, sortie invalide ou échec de sauvegarde après génération) conservent le quota, car l’appel peut avoir été facturé. Le verrou de doublon est local au processus; le quota SQL est partagé entre instances.', '- Le calcul est texte seul, Standard/short context, sans remise, cache, frais d’outil, taxes ni conversion garantie. Tarifs et modèle peuvent évoluer. Les actions déterministes (import CV/offre, matching simple, statistiques) ne génèrent pas de coût API.', '', 'Commandes : `npm run estimate:free-ai-cost` depuis `backend/`. Variables optionnelles : `FREE_AI_INPUT_PRICE_PER_MILLION`, `FREE_AI_CACHED_INPUT_PRICE_PER_MILLION`, `FREE_AI_OUTPUT_PRICE_PER_MILLION`, `FREE_AI_CACHED_INPUT_SHARE` (0 à 1). Aucun appel OpenAI n’est effectué par ce script.')
  return lines.join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(formatReport(createReport()))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
