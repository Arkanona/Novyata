import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'
import { presentAnalysisForPlan } from '../utils/analysisPresentation.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function serializeAnalysis(row, detailed = false) {
  const base = {
    id_job_analysis: row.id_job_analysis,
    id_resume: row.id_resume,
    title_resume: row.title_resume,
    company_name: row.company_name,
    job_title: row.job_title,
    match_score: row.match_score,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
  return detailed ? { ...base, job_description: row.job_description, analysis: { ...presentAnalysisForPlan(row.analysis_result, row.plan), id_job_analysis: row.id_job_analysis, created_at: row.created_at, updated_at: row.updated_at } } : base
}

export async function listJobAnalyses(req, res, next) {
  try {
    const result = await requireDatabase().query('select job_analyses.id_job_analysis, job_analyses.id_resume, resumes.title_resume, job_analyses.company_name, job_analyses.job_title, job_analyses.match_score, job_analyses.created_at, job_analyses.updated_at from job_analyses join resumes on resumes.id_resume = job_analyses.id_resume where job_analyses.id_user = $1 order by job_analyses.updated_at desc', [req.auth.sub])
    return res.json({ job_analyses: result.rows.map((row) => serializeAnalysis(row)) })
  } catch (error) { return next(error) }
}

export async function getJobAnalysis(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant d’analyse invalide.')
    const result = await requireDatabase().query('select job_analyses.id_job_analysis, job_analyses.id_resume, resumes.title_resume, users.plan, job_analyses.company_name, job_analyses.job_title, job_analyses.job_description, job_analyses.match_score, job_analyses.analysis_result, job_analyses.created_at, job_analyses.updated_at from job_analyses join resumes on resumes.id_resume = job_analyses.id_resume join users on users.id_user = job_analyses.id_user where job_analyses.id_job_analysis = $1 and job_analyses.id_user = $2', [req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Analyse introuvable.')
    return res.json({ job_analysis: serializeAnalysis(result.rows[0], true) })
  } catch (error) { return next(error) }
}

export async function deleteJobAnalysis(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant d’analyse invalide.')
    const result = await requireDatabase().query('delete from job_analyses where id_job_analysis = $1 and id_user = $2 returning id_job_analysis', [req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Analyse introuvable.')
    return res.status(204).send()
  } catch (error) { return next(error) }
}
