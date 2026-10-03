import ApiError from '../utils/ApiError.js'
import { importOfferFromUrl } from '../services/offerUrlService.js'

export async function importOfferUrl(req, res, next) {
  try {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
    if (!url || url.length > 2048) throw new ApiError(400, 'Saisissez une URL valide de 2 048 caractères maximum.')
    return res.json({ offer: await importOfferFromUrl(url) })
  } catch (error) { return next(error) }
}
