import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { AI_FEATURES, PLANS } from '../src/config/plans.js'
import { TOKEN_METRICS, buildScenario, callMetrics, maxOutputLabel, priceTokens, resolvePrices } from './estimateFreePlanAiCost.js'

const plan = 'pro'
const mixedUse = [{ key: 'light', share: 0.30 }, { key: 'average', share: 0.45 }, { key: 'active', share: 0.20 }, { key: 'intensive', share: 0.05 }]
const userScenarios = [
  { key: 'light', label: 'Pro léger (~25 %)', fraction: 0.25 },
  { key: 'average', label: 'Pro moyen (~50 %)', fraction: 0.50 },
  { key: 'active', label: 'Pro actif (~75 %)', fraction: 0.75 },
  { key: 'intensive', label: 'Pro intensif (100 %)', fraction: 1 },
]
const euroPrices = [4.99, 7.99, 9.99, 14.99]
const scaleUsers = [10, 100, 1000, 10000, 100000]

function money(value, currency = '$') { return `${currency}${value.toFixed(6)}` }
function count(value) { return Math.round(value).toLocaleString('fr-FR') }
function percent(value) { return `${value.toFixed(1)} %` }
function quota(feature) { return PLANS[plan].quotas[feature] || 0 }

function totalsByFraction(fraction, prices, maximum = false, selectedPlan = plan, bounded = maximum) {
  return buildScenario(fraction, prices, { maximum, plan: selectedPlan, bounded })
}

export function createReport({ prices = resolvePrices(), eurPerUsd = Number(process.env.FREE_AI_EUR_PER_USD ?? 1) } = {}) {
  if (!Number.isFinite(eurPerUsd) || eurPerUsd <= 0) throw new Error('FREE_AI_EUR_PER_USD doit être un taux positif.')
  const scenarios = userScenarios.map((scenario) => ({ ...scenario, ...totalsByFraction(scenario.fraction, prices, false, plan, false) }))
  const scenarioByKey = new Map(scenarios.map((scenario) => [scenario.key, scenario]))
  const realisticCost = mixedUse.reduce((sum, item) => sum + scenarioByKey.get(item.key).totalCost * item.share, 0)
  const maximum = buildScenario(1, prices, { maximum: true, plan, bounded: true })
  const average = scenarioByKey.get('average')
  const active = scenarioByKey.get('active')
  const featureCosts = Object.values(AI_FEATURES).map((feature) => {
    const calls = quota(feature)
    const tokens = callMetrics(feature, calls, { maximum: true, plan, bounded: true })
    const cost = priceTokens(tokens, prices)
    return { feature, label: TOKEN_METRICS[feature].label, calls, ...tokens, ...cost, share: maximum.totalCost ? cost.totalCost / maximum.totalCost : 0 }
  }).sort((left, right) => right.totalCost - left.totalCost)
  const comparativeUtilization = [0.25, 0.5, 0.75, 1].map((fraction) => {
    const free = totalsByFraction(fraction, prices, fraction === 1, 'free')
    const pro = totalsByFraction(fraction, prices, fraction === 1, 'pro')
    return { fraction, free, pro, ratio: free.totalCost ? pro.totalCost / free.totalCost : null }
  })
  const interviewSessions = [
    { label: '5 réponses évaluées', calls: 6 },
    { label: '10 réponses évaluées', calls: 11 },
    { label: 'Quota mensuel Pro (59 feedbacks + Q60 en attente)', calls: quota(AI_FEATURES.INTERVIEW_SIMULATION) },
  ].map((session) => {
    const tokens = callMetrics(AI_FEATURES.INTERVIEW_SIMULATION, session.calls, { plan, bounded: true })
    return { ...session, withinMonthlyQuota: session.calls <= quota(AI_FEATURES.INTERVIEW_SIMULATION), ...tokens, ...priceTokens(tokens, prices) }
  })
  const adaptationTokens = callMetrics(AI_FEATURES.CV_ADAPTATION, 1, { plan, bounded: true })
  const adaptationCost = priceTokens(adaptationTokens, prices)
  const scaled = scaleUsers.map((users) => ({
    users,
    allAverage: average.totalCost * users,
    realisticMix: realisticCost * users,
    allMaximum: maximum.totalCost * users,
  }))
  const subscriptionEconomics = euroPrices.map((price) => {
    const avgCostEuro = average.totalCost * eurPerUsd
    const activeCostEuro = active.totalCost * eurPerUsd
    const intensiveCostEuro = maximum.totalCost * eurPerUsd
    const maxUsageMultiple = avgCostEuro ? intensiveCostEuro / avgCostEuro : Infinity
    const breakEven = [0.10, 0.25, 0.50, 1].map((targetShare) => {
      const multiples = avgCostEuro ? targetShare * price / avgCostEuro : Infinity
      return { targetShare, multiples, reachableByModeledQuotas: multiples <= maxUsageMultiple }
    })
    return {
      price, averageCostEuro: avgCostEuro, activeCostEuro, intensiveCostEuro,
      averageMarginEuro: price - avgCostEuro,
      activeMarginEuro: price - activeCostEuro,
      intensiveMarginEuro: price - intensiveCostEuro,
      breakEven,
      modeledQuotaCanReachPrice: intensiveCostEuro >= price,
    }
  })
  return {
    prices, eurPerUsd, scenarios, realisticCost, maximum, featureCosts, comparativeUtilization,
    interviewSessions, adaptationTokens, adaptationCost,
    adaptationMonthlyCost: featureCosts.find((item) => item.feature === AI_FEATURES.CV_ADAPTATION)?.totalCost || 0,
    adaptationShare: maximum.totalCost ? (featureCosts.find((item) => item.feature === AI_FEATURES.CV_ADAPTATION)?.totalCost || 0) / maximum.totalCost : 0,
    scaled, subscriptionEconomics,
  }
}

export function formatReport(report) {
  const lines = [
    'NOVYATA PRO — simulation mensuelle des coûts IA',
    `Modèle: ${report.prices.model} · ${report.prices.source} · input $${report.prices.inputPricePerMillion}/M · cache $${report.prices.cachedInputPricePerMillion}/M · output $${report.prices.outputPricePerMillion}/M · raisonnement inclus dans output.`,
    `Conversion pour la marge: ${report.eurPerUsd.toFixed(4)} €/USD (valeur illustrative configurable, pas un taux de change de marché). Les prix sont des hypothèses mensuelles nominales en euros: Stripe est mensuel/récurrent, mais le dépôt ne fixe ni montant, ni traitement TTC/HT / taxes.`,
    '',
    'Profils mensuels par utilisateur',
    '| Profil | Appels | Input | Output | Raisonnement inclus | Total tokens | Coût IA |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ]
  for (const item of report.scenarios) lines.push(`| ${item.label} | ${count(item.calls)} | ${count(item.inputTokens)} | ${count(item.outputTokens)} | ${count(item.reasoningTokens)} | ${count(item.inputTokens + item.outputTokens)} | ${money(item.totalCost)} |`)
  lines.push(`| Répartition 30/45/20/5 | — | — | — | — | — | ${money(report.realisticCost)} / utilisateur |`)
  lines.push('', `Quota total Pro: ${Object.values(AI_FEATURES).reduce((sum, feature) => sum + quota(feature), 0)} appels/mois (toutes catégories); référence intensif: ${count(report.maximum.calls)} appels, ${count(report.maximum.inputTokens)} input, ${count(report.maximum.outputTokens)} output, dont ${count(report.maximum.reasoningTokens)} reasoning, ${count(report.maximum.inputTokens + report.maximum.outputTokens)} tokens facturables, ${money(report.maximum.totalCost)} IA.`)
  lines.push('', 'Quotas, une action = un appel', '', '| Fonction OpenAI | Quota Free | Quota Pro | Max output | Input / output / reasoning au quota Pro | Coût/call moyen* | Coût au quota Pro | Part du coût Pro | État métrique |', '|---|---:|---:|---:|---:|---:|---:|---:|---|')
  for (const row of report.featureCosts) {
    const featureMetric = TOKEN_METRICS[row.feature]
    const freeLimit = PLANS.free.quotas[row.feature] || 0
    let quotaLabel = String(row.calls)
    if (row.feature === AI_FEATURES.APPLICATION_FOLLOWUP) quotaLabel += ' (relances avancées + remerciement inclus)'
    if (row.feature === AI_FEATURES.RESUME_SUMMARY) quotaLabel += ' partagé génération/reformulation'
    if (row.feature === AI_FEATURES.INTERVIEW_SIMULATION) quotaLabel += ' tours, STAR Pro'
    lines.push(`| ${featureMetric.label} | ${freeLimit} | ${quotaLabel} | ${maxOutputLabel(row.feature, 'pro')} | ${count(row.inputTokens / row.calls)} / ${count(row.outputTokens / row.calls)} / ${count(row.reasoningTokens / row.calls)} | ${money(row.totalCost / row.calls)} | ${money(row.totalCost)} | ${percent(row.share * 100)} | ${featureMetric.source === 'observed' ? 'MESURÉE; coût au plafond' : 'ESTIMÉE; coût au plafond'} |`)
  }
  lines.push('', 'Modèle: toutes les fonctions utilisent `OPENAI_MODEL` (localement gpt-6-luna) avec `reasoning.effort=low`. Plafonds de sortie explicites: analyse 1650 défaut configurable/plafonné, lettre 1400, adaptation 1650, relance 700, préparation 1300, simulation Free 650 / Pro 900, résumé et expérience 500. Chaque fonction a aussi une limite de taille de requête. Le quota est réservé atomiquement avant génération; épuisement = HTTP 429. Les limites sont mensuelles UTC.', '', 'Adaptation CV à une offre', '', `Par adaptation: 1 appel, enveloppe maximale ${count(report.adaptationTokens.inputTokens)} tokens d’entrée et ${count(report.adaptationTokens.outputTokens)} de sortie (dont ${count(report.adaptationTokens.reasoningTokens)} max de raisonnement inclus), coût maximal théorique ${money(report.adaptationCost.totalCost)}. Le calcul utilise les limites d’octets de requête et de sortie, sans remise cache; l’usage ordinaire devrait être inférieur. Le CV compact et les champs éditables (profil + expériences), l’analyse enregistrée et l’offre sont fournis au modèle; résultat Structured Output jusqu’à 6 propositions. Aucun nouvel appel d’analyse: l’analyse et l’offre enregistrées sont chargées, puis un seul appel d’adaptation est fait. L’application des propositions acceptées est déterministe, sans OpenAI. Au quota de 30: ${money(report.adaptationMonthlyCost)} / mois, soit ${percent(report.adaptationShare * 100)} du budget maximal théorique Pro.`)
  lines.push('', 'Simulation d’entretien Pro', '', '| Session | Appels | Feedbacks | Input | Output | Raisonnement inclus | Coût | Dans le quota mensuel ? |', '|---|---:|---:|---:|---:|---:|---:|---|')
  for (const session of report.interviewSessions) {
    const feedbacks = Math.max(0, session.calls - 1)
    lines.push(`| ${session.label} | ${session.calls} | ${feedbacks} | ${count(session.inputTokens)} | ${count(session.outputTokens)} | ${count(session.reasoningTokens)} | ${money(session.totalCost)} | ${session.withinMonthlyQuota ? 'oui' : 'non'} |`)
  }
  lines.push('Démarrer = 1 appel pour Q1; chaque réponse = 1 appel qui fournit feedback + question suivante. 5 réponses nécessitent donc 6 appels; 10, 11. Le quota de 60 est par mois, pas par session: si tout le quota va à une seule session, 59 réponses sont évaluées et Q60 reste en attente. L’API reçoit le poste, CV résumé, offre tronquée à 2 500 caractères, analyse compacte, notes et uniquement la réponse actuelle (jusqu’à 4 000 caractères), pas les échanges antérieurs; le contexte ne croît donc pas avec le nombre de tours, hors longueur de la réponse courante. Le coaching STAR augmente le schéma et le résultat Pro; l’output Pro utilisé ici est estimé plus haut que Free.')
  lines.push('', 'Comparaison Free / Pro à taux d’utilisation identique', '', '| Utilisation des quotas | Appels Free | Coût Free | Appels Pro | Coût Pro | Pro / Free |', '|---|---:|---:|---:|---:|---:|')
  for (const row of report.comparativeUtilization) lines.push(`| ${Math.round(row.fraction * 100)} % | ${row.free.calls} | ${money(row.free.totalCost)} | ${row.pro.calls} | ${money(row.pro.totalCost)} | ${row.ratio.toFixed(2)}× |`)
  lines.push(`Au profil moyen comparé à 50 % d’utilisation identique: Pro / Free = ${report.comparativeUtilization.find((row) => row.fraction === 0.5).ratio.toFixed(2)}×. Les anciennes mesures de référence Free étaient 25 %: $0.002029, 60 %: $0.004903, 100 %: $0.007872; elles reposent sur la même base de métriques.`)
  lines.push('', 'Projection de coût IA mensuel Pro', '', '| Abonnés Pro | Tous moyens (~50 %) | Mix 30/45/20/5 | Tous à l’enveloppe technique maximale |', '|---:|---:|---:|---:|')
  for (const item of report.scaled) lines.push(`| ${count(item.users)} | ${money(item.allAverage)} | ${money(item.realisticMix)} | ${money(item.allMaximum)} |`)
  lines.push('', 'Marge après coût IA uniquement (pas un bénéfice net)', '', '| Prix mensuel nominal | Revenu | Coût IA moyen estimé | Marge IA moyenne | Coût IA actif 75 % estimé | Marge IA active | Budget IA plafond technique | Marge vs plafond | Plafond dépasse le prix ? |', '|---:|---:|---:|---:|---:|---:|---:|---:|---|')
  for (const row of report.subscriptionEconomics) lines.push(`| €${row.price.toFixed(2)} | €${row.price.toFixed(2)} | ${money(row.averageCostEuro, '€')} | ${money(row.averageMarginEuro, '€')} | ${money(row.activeCostEuro, '€')} | ${money(row.activeMarginEuro, '€')} | ${money(row.intensiveCostEuro, '€')} | ${money(row.intensiveMarginEuro, '€')} | ${row.modeledQuotaCanReachPrice ? 'oui' : 'non'} |`)
  lines.push('', 'Multiplicateur d’usage moyen nécessaire pour que le coût IA atteigne le pourcentage du prix indiqué (ce multiplicateur n’est pas une consommation garantie ni un volume autorisé; le plafond actuel modélisé est le scénario intensif):', '', '| Prix | 10 % du prix | 25 % | 50 % | 100 % | Plafond quota ≈ × usage moyen |', '|---:|---:|---:|---:|---:|---:|')
  for (const row of report.subscriptionEconomics) lines.push(`| €${row.price.toFixed(2)} | ${row.breakEven.map((point) => `×${point.multiples.toFixed(1)}${point.reachableByModeledQuotas ? ' (atteignable)' : ''}`).join(' | ')} | ×${(row.intensiveCostEuro / row.averageCostEuro).toFixed(2)} |`)
  lines.push('', `Seuil prix / budget IA: les quatre prix simulés sont comparés au scénario quota-max, plafonné par les limites techniques configurées. Cette enveloppe suppose toutes les requêtes à leur taille maximale, toutes les sorties à leur plafond, sans cache ni remise. Elle est une borne conservatrice sous les tarifs et modèle choisis, pas une prévision de consommation habituelle; prix, taxes et modèle peuvent évoluer.`)
  lines.push('', 'Top coûts IA Pro au quota mensuel', '', '| Rang | Fonction | Coût/appel moyen au quota | Coût mensuel au quota | Part du coût Pro estimé |', '|---:|---|---:|---:|---:|')
  report.featureCosts.forEach((item, index) => lines.push(`| ${index + 1} | ${TOKEN_METRICS[item.feature].label} | ${money(item.totalCost / item.calls)} | ${money(item.totalCost)} | ${percent(item.share * 100)} |`))
  lines.push('', 'Fonctions OpenAI exhaustives du backend: analyse, lettres, adaptation CV, résumé/reformulation, réécriture d’expérience, préparation et simulation d’entretien, relances et remerciements. Les opérations déterministes (import, suggestions simples, statistiques et notifications) n’appellent pas OpenAI. Relances avancées et remerciements partagent le quota application_followup.', '', 'Garde-fous vérifiés: client OpenAI central, plafond de sortie et taille de requête pour chaque action, timeout, limiteur IA partagé 20/15 min/IP, déduplication des appels identiques en cours, réservation atomique des quotas et aucun retry automatique. Une erreur avant dispatch libère la réservation; après dispatch, une erreur ambiguë conserve le quota afin qu’une requête potentiellement facturée ne soit pas relancée gratuitement. Le verrou de doublon est local à une instance, tandis que la réservation SQL est atomique entre instances.', '', 'Méthode: analyse d’offre mesurée (963 input / 829 output / 244 reasoning, inclus dans output); autres valeurs usuelles estimées. Les scénarios maximaux utilisent les octets de requête configurés comme borne conservatrice du volume de tokens d’entrée et le plafond de sortie par fonction, cache désactivé. Le total de raisonnement est un sous-ensemble de output et n’est jamais facturé deux fois. Les prix ne couvrent pas les taxes, frais annexes ou changements de modèle/tarif. Aucun appel OpenAI n’est effectué par ce script.', '', 'Tarifs: OpenAI GPT-6 Luna Standard, short context, 3 octobre 2026, source officielle https://developers.openai.com/api/docs/models/gpt-6-luna (input $0.10/M, cached input $0.01/M, output $0.50/M). Paramètres: `FREE_AI_INPUT_PRICE_PER_MILLION`, `FREE_AI_CACHED_INPUT_PRICE_PER_MILLION`, `FREE_AI_OUTPUT_PRICE_PER_MILLION`, `FREE_AI_CACHED_INPUT_SHARE`, `FREE_AI_EUR_PER_USD` (approximation de conversion, défaut 1), aucun contenu .env ni clé OpenAI affichés.')
  return lines.join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(formatReport(createReport())) } catch (error) { console.error(error.message); process.exitCode = 1 }
}
