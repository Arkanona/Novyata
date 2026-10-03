import { requireDatabase } from '../config/database.js'
import { capabilitiesFor } from '../config/plans.js'
import ApiError from '../utils/ApiError.js'
import { summarizeSavedOffer } from '../utils/jobOfferComparison.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function compareSavedOffers(req, res, next) {
  try {
    const ids = req.body?.analysisIds
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 3 || new Set(ids).size !== ids.length || ids.some((id) => typeof id !== 'string' || !uuidPattern.test(id))) {
      throw new ApiError(400, 'Sélectionnez deux ou trois analyses distinctes à comparer.')
    }
    const result = await requireDatabase().query(
      'select job_analyses.id_job_analysis,job_analyses.company_name,job_analyses.job_title,job_analyses.job_description,job_analyses.match_score,job_analyses.analysis_result,users.plan from job_analyses join users on users.id_user=job_analyses.id_user where job_analyses.id_user=$1 and job_analyses.id_job_analysis=any($2::uuid[])',
      [req.auth.sub, ids],
    )
    if (result.rows.length !== ids.length) throw new ApiError(404, 'Une ou plusieurs analyses sont introuvables.')
    if (!capabilitiesFor(result.rows[0].plan).advancedATS) throw new ApiError(403, 'La comparaison de plusieurs offres est disponible avec Novyata Pro.')
    const rows = new Map(result.rows.map((row) => [row.id_job_analysis, row]))
    return res.json({ offers: ids.map((id) => summarizeSavedOffer(rows.get(id))) })
  } catch (error) { return next(error) }
}
