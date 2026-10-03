import { INTERVIEW_NOTIFICATION_HOURS, NO_RESPONSE_NOTIFICATION_DAYS } from '../config/applications.js'

export async function refreshUserNotifications(database, userId, now = new Date()) {
  const interviewCutoff = new Date(now.getTime() + INTERVIEW_NOTIFICATION_HOURS * 60 * 60 * 1000)
  await database.query(
    `update notifications n set archived_at = now(), is_read = true
     where n.id_user = $1 and n.archived_at is null and (
       (n.type = 'no_response' and not exists (
         select 1 from applications a
         left join lateral (select max(f.sent_at) as last_sent_at from application_followups f where f.id_application = a.id_application and f.sent_at is not null) sent on true
         where a.id_application = n.id_application and a.id_user = $1 and a.application_date is not null
           and a.status in ('Candidature envoyée', 'En cours d’étude')
           and n.scheduled_for = coalesce(sent.last_sent_at, a.application_date::timestamptz) + make_interval(days => $2)
           and coalesce(sent.last_sent_at, a.application_date::timestamptz) <= $3::timestamptz - make_interval(days => $2)
       ))
       or (n.type = 'interview_soon' and not exists (
         select 1 from interviews i join applications a on a.id_application = i.id_application
         where a.id_application = n.id_application and a.id_user = $1 and n.dedupe_key = 'interview:' || i.id_interview::text
           and a.status not in ('Archivée', 'Refusée') and i.interview_date > $3 and i.interview_date <= $4
       ))
       or (n.type = 'next_action' and exists (
         select 1 from applications a where a.id_application = n.id_application and a.id_user = $1 and a.status in ('Archivée', 'Refusée')
       ))
     )`,
    [userId, NO_RESPONSE_NOTIFICATION_DAYS, now, interviewCutoff],
  )
  const [interviews, applications] = await Promise.all([
    database.query(
      `select i.id_interview, i.interview_date, a.id_application, a.company_name, a.job_title
       from interviews i join applications a on a.id_application = i.id_application
       where a.id_user = $1 and i.interview_date > $2 and i.interview_date <= $3
         and a.status not in ('Archivée', 'Refusée')`,
      [userId, now, interviewCutoff],
    ),
    database.query(
      `select a.id_application, a.company_name, a.job_title,
         coalesce(sent.last_sent_at, a.application_date::timestamptz) as reminder_anchor
       from applications a
       left join lateral (
         select max(f.sent_at) as last_sent_at
         from application_followups f where f.id_application = a.id_application and f.sent_at is not null
       ) sent on true
       where a.id_user = $1 and a.application_date is not null
         and a.status in ('Candidature envoyée', 'En cours d’étude')
         and coalesce(sent.last_sent_at, a.application_date::timestamptz) <= $2::timestamptz - make_interval(days => $3)`,
      [userId, now, NO_RESPONSE_NOTIFICATION_DAYS],
    ),
  ])

  for (const row of interviews.rows) {
    const date = new Date(row.interview_date)
    await database.query(
      `insert into notifications (id_user, id_application, type, title, body, dedupe_key, scheduled_for)
       values ($1, $2, 'interview_soon', 'Votre entretien approche', $3, $4, $5)
       on conflict (id_user, dedupe_key) do update
       set title = excluded.title, body = excluded.body, scheduled_for = excluded.scheduled_for, updated_at = now()
       where notifications.archived_at is null`,
      [userId, row.id_application, `${row.company_name} · ${row.job_title} — ${date.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })}`, `interview:${row.id_interview}`, date],
    )
  }

  for (const row of applications.rows) {
    const anchor = new Date(row.reminder_anchor)
    const anchorKey = anchor.toISOString()
    await database.query(
      `insert into notifications (id_user, id_application, type, title, body, dedupe_key, scheduled_for)
       values ($1, $2, 'no_response', 'Une relance est possible', $3, $4, $5)
       on conflict (id_user, dedupe_key) do nothing`,
      [userId, row.id_application, `Aucune réponse de ${row.company_name} depuis ${NO_RESPONSE_NOTIFICATION_DAYS} jours pour « ${row.job_title} ».`, `no_response:${row.id_application}:${anchorKey}`, new Date(anchor.getTime() + NO_RESPONSE_NOTIFICATION_DAYS * 86_400_000)],
    )
  }
}
