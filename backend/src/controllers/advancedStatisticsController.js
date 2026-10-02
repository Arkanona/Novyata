import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const responseStatuses = new Set(['En cours d’étude', 'Entretien', 'Proposition', 'Refusée'])
const interviewStatuses = new Set(['Entretien', 'Proposition'])
const sentStatuses = new Set(['Candidature envoyée', ...responseStatuses, 'Archivée'])
const weekInMs = 7 * 24 * 60 * 60 * 1000
const allowedPeriods = new Set([30, 90, 180])

function periodDays(value) {
  const parsed = Number.parseInt(value, 10)
  return allowedPeriods.has(parsed) ? parsed : 90
}

function dateValue(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function weekStart(date) {
  const result = new Date(date)
  result.setUTCHours(0, 0, 0, 0)
  result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7))
  return result
}

function statusFromEvent(event) {
  if (event.type !== 'status_change' || typeof event.title !== 'string') return null
  const status = event.title.replace(/^Statut\s*:\s*/, '')
  return responseStatuses.has(status) ? status : null
}

export async function getAdvancedStatistics(req, res, next) {
  try {
    const database = requireDatabase()
    const account = await database.query('select plan from users where id_user = $1', [req.auth.sub])
    if (!account.rows[0]) throw new ApiError(401, 'Utilisateur introuvable.')
    if (account.rows[0].plan !== 'pro') throw new ApiError(403, 'Les statistiques avancées sont disponibles avec Novyata Pro.', { upgrade: true })

    const days = periodDays(req.query.period)
    const [applicationsResult, eventsResult] = await Promise.all([
      database.query(
        `select applications.id_application, applications.id_resume, applications.status, applications.application_date,
                applications.created_at, resumes.title_resume
         from applications
         left join resumes on resumes.id_resume = applications.id_resume and resumes.id_user = $1
         where applications.id_user = $1
           and coalesce(applications.application_date::timestamp, applications.created_at) >= current_date - ($2::int * interval '1 day')
         order by coalesce(applications.application_date::timestamp, applications.created_at) asc`,
        [req.auth.sub, days],
      ),
      database.query(
        `select events.id_application, events.type, events.title, events.event_date
         from application_events events
         join applications on applications.id_application = events.id_application
         where applications.id_user = $1
           and events.event_date >= current_date - ($2::int * interval '1 day') - interval '1 year'
         order by events.event_date asc`,
        [req.auth.sub, days],
      ),
    ])

    const applications = applicationsResult.rows
    const sentApplications = applications.filter((application) => sentStatuses.has(application.status))
    const events = eventsResult.rows
    const appById = new Map(sentApplications.map((application) => [application.id_application, application]))
    const firstResponseByApplication = new Map()
    for (const event of events) {
      if (!statusFromEvent(event) || !appById.has(event.id_application) || firstResponseByApplication.has(event.id_application)) continue
      firstResponseByApplication.set(event.id_application, dateValue(event.event_date))
    }

    const now = new Date()
    const currentWeek = weekStart(now)
    const weeks = Array.from({ length: 8 }, (_, index) => {
      const date = new Date(currentWeek.getTime() - (7 - index) * weekInMs)
      const key = date.toISOString().slice(0, 10)
      return { week: key, label: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date), applications: 0, responses: 0 }
    })
    const weekIndex = new Map(weeks.map((week, index) => [week.week, index]))

    for (const application of sentApplications) {
      const submittedAt = dateValue(application.application_date || application.created_at)
      if (submittedAt) {
        const index = weekIndex.get(weekStart(submittedAt).toISOString().slice(0, 10))
        if (index !== undefined) weeks[index].applications += 1
      }
      const responseAt = firstResponseByApplication.get(application.id_application)
      if (responseAt) {
        const index = weekIndex.get(weekStart(responseAt).toISOString().slice(0, 10))
        if (index !== undefined) weeks[index].responses += 1
      }
    }

    const responseDelays = sentApplications.flatMap((application) => {
      const submittedAt = dateValue(application.application_date)
      const responseAt = firstResponseByApplication.get(application.id_application)
      if (!submittedAt || !responseAt) return []
      const daysToResponse = Math.floor((responseAt.getTime() - submittedAt.getTime()) / (24 * 60 * 60 * 1000))
      return daysToResponse >= 0 ? [daysToResponse] : []
    })

    const outcomesByResume = new Map()
    for (const application of sentApplications) {
      const key = application.id_resume || 'unlinked'
      if (!outcomesByResume.has(key)) outcomesByResume.set(key, {
        resumeId: application.id_resume,
        resumeTitle: application.id_resume ? application.title_resume || 'CV' : 'Sans CV associé',
        applications: 0,
        responses: 0,
        interviews: 0,
        offers: 0,
      })
      const outcome = outcomesByResume.get(key)
      outcome.applications += 1
      if (responseStatuses.has(application.status)) outcome.responses += 1
      if (interviewStatuses.has(application.status)) outcome.interviews += 1
      if (application.status === 'Proposition') outcome.offers += 1
    }

    const responseCount = sentApplications.filter((application) => responseStatuses.has(application.status)).length
    const interviewCount = sentApplications.filter((application) => application.status === 'Entretien' || application.status === 'Proposition').length
    const offerCount = sentApplications.filter((application) => application.status === 'Proposition').length
    return res.json({
      periodDays: days,
      funnel: {
        applications: sentApplications.length,
        responses: responseCount,
        interviews: interviewCount,
        offers: offerCount,
        refusals: applications.filter((application) => application.status === 'Refusée').length,
      },
      responseRate: sentApplications.length ? Math.round((responseCount / sentApplications.length) * 100) : null,
      interviewRate: sentApplications.length ? Math.round((interviewCount / sentApplications.length) * 100) : null,
      weeklyTrend: weeks,
      averageResponseDelayDays: responseDelays.length ? Math.round(responseDelays.reduce((sum, value) => sum + value, 0) / responseDelays.length) : null,
      responseDelaySampleSize: responseDelays.length,
      outcomesByResume: [...outcomesByResume.values()].sort((left, right) => right.applications - left.applications),
      historyNote: 'Les délais et l’évolution des réponses reposent sur les changements de statut enregistrés dans Novyata.',
    })
  } catch (error) { return next(error) }
}
