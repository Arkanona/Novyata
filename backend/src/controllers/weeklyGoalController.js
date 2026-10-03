import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const defaults = Object.freeze({ is_enabled: false, target_applications: 5, target_followups: 2, target_interviews: 1 })

async function loadCurrent(database, userId) {
  const result = await database.query(
    `with bounds as (select date_trunc('week', current_date)::date as week_start)
     select b.week_start, coalesce(g.is_enabled,false) as is_enabled,
       coalesce(g.target_applications,5) as target_applications, coalesce(g.target_followups,2) as target_followups, coalesce(g.target_interviews,1) as target_interviews,
       (select count(*)::int from applications a where a.id_user=$1 and a.created_at >= b.week_start and a.created_at < b.week_start + 7) as applications_done,
       (select count(*)::int from application_followups f join applications a using(id_application) where a.id_user=$1 and f.sent_at >= b.week_start and f.sent_at < b.week_start + 7) as followups_done,
       (select count(*)::int from interview_sessions s where s.id_user=$1 and s.created_at >= b.week_start and s.created_at < b.week_start + 7) as interviews_done
     from bounds b left join weekly_goals g on g.id_user=$1 and g.week_start=b.week_start`, [userId],
  )
  const row = result.rows[0]
  return {
    goal: { is_enabled: row.is_enabled, target_applications: row.target_applications, target_followups: row.target_followups, target_interviews: row.target_interviews },
    week_start: row.week_start,
    progress: { applications: row.applications_done, followups: row.followups_done, interviews: row.interviews_done },
  }
}

export async function getWeeklyGoal(req, res, next) {
  try { return res.json(await loadCurrent(requireDatabase(), req.auth.sub)) } catch (error) { return next(error) }
}

export async function saveWeeklyGoal(req, res, next) {
  try {
    const body = req.body || {}
    if (typeof body.is_enabled !== 'boolean') throw new ApiError(400, 'Activez ou désactivez les objectifs explicitement.')
    const fields = ['target_applications', 'target_followups', 'target_interviews']
    if (fields.some((field) => !Number.isInteger(body[field]) || body[field] < 1 || body[field] > 50)) throw new ApiError(400, 'Chaque objectif doit être compris entre 1 et 50.')
    const database = requireDatabase()
    await database.query(
      `insert into weekly_goals (id_user,week_start,is_enabled,target_applications,target_followups,target_interviews)
       values ($1,date_trunc('week',current_date)::date,$2,$3,$4,$5)
       on conflict (id_user,week_start) do update set is_enabled=excluded.is_enabled,target_applications=excluded.target_applications,target_followups=excluded.target_followups,target_interviews=excluded.target_interviews,updated_at=now()`,
      [req.auth.sub, body.is_enabled, body.target_applications, body.target_followups, body.target_interviews],
    )
    return res.json(await loadCurrent(database, req.auth.sub))
  } catch (error) { return next(error) }
}

export { defaults as WEEKLY_GOAL_DEFAULTS }
