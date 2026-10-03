import { requireDatabase } from '../config/database.js'
import { capabilitiesFor } from '../config/plans.js'
import ApiError from '../utils/ApiError.js'
import { matchResumesToOffer } from '../utils/resumeOfferMatching.js'

export async function matchResumesToOfferController(req, res, next) {
  try {
    const jobDescription = typeof req.body?.jobDescription === 'string' ? req.body.jobDescription.trim() : ''
    if (!jobDescription || jobDescription.length > 20_000) throw new ApiError(400, 'Collez une offre valide de 20 000 caractères maximum.')
    const database = requireDatabase()
    const user = await database.query('select plan from users where id_user=$1', [req.auth.sub])
    if (!user.rows[0]) throw new ApiError(404, 'Utilisateur introuvable.')
    if (!capabilitiesFor(user.rows[0].plan).advancedATS) throw new ApiError(403, 'La comparaison de plusieurs CV est disponible avec Novyata Pro.')
    const result = await database.query(
      `select r.id_resume,r.title_resume,r.job_title,r.summary,
        coalesce((select json_agg(json_build_object('name',s.name,'level',s.level)) from skills s where s.id_resume=r.id_resume),'[]'::json) as skills,
        coalesce((select json_agg(json_build_object('job_title',e.job_title,'company',e.company,'description',e.description)) from experiences e where e.id_resume=r.id_resume),'[]'::json) as experiences,
        coalesce((select json_agg(json_build_object('degree',ed.degree,'school',ed.school,'description',ed.description)) from educations ed where ed.id_resume=r.id_resume),'[]'::json) as educations
       from resumes r where r.id_user=$1 order by r.updated_at desc limit 25`, [req.auth.sub],
    )
    if (result.rows.length < 2) throw new ApiError(422, 'Créez au moins deux CV pour les comparer à cette offre.')
    const matching = matchResumesToOffer({ resumes: result.rows, jobDescription })
    return res.json({ matching: { ...matching, confidence: matching.skillsCompared ? 'estimated' : 'insufficient_data', note: matching.skillsCompared ? 'Estimation fondée sur les compétences explicitement détectées dans l’offre et les contenus de vos CV.' : 'Aucune compétence reconnue dans le texte de l’offre : aucune estimation fiable ne peut être calculée.' } })
  } catch (error) { return next(error) }
}
