import dns from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import ApiError from '../utils/ApiError.js'

const MAX_REDIRECTS = 3
const MAX_RESPONSE_BYTES = 1_000_000
const REQUEST_TIMEOUT_MS = 8_000
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.test', '.invalid']

function isPrivateIp(address) {
  const version = net.isIP(address)
  if (version === 4) {
    const parts = address.split('.').map(Number)
    const [a, b] = parts
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 2, 168].includes(b)) ||
      (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0)
  }
  if (version === 6) {
    const normalized = address.toLowerCase().split('%')[0]
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') ||
      normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') ||
      normalized.startsWith('::ffff:')
  }
  return true
}

export function validateOfferUrl(value) {
  let url
  try { url = new URL(value) } catch { throw new ApiError(400, 'Saisissez une URL valide.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new ApiError(400, 'Seules les URL publiques HTTP ou HTTPS sont acceptées.')
  if (url.port && !['80', '443'].includes(url.port)) throw new ApiError(400, 'Le port de cette URL n’est pas autorisé.')
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!hostname || hostname === 'localhost' || BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) throw new ApiError(400, 'Cette adresse ne peut pas être importée.')
  if (net.isIP(hostname) && isPrivateIp(hostname)) throw new ApiError(400, 'Les adresses réseau privées ne peuvent pas être importées.')
  return url
}

async function resolvePublicAddresses(hostname, resolver = dns.lookup) {
  if (net.isIP(hostname)) return [{ address: hostname, family: net.isIP(hostname) }]
  let records
  try { records = await resolver(hostname, { all: true, verbatim: true }) } catch { throw new ApiError(400, 'Le domaine de cette offre est inaccessible.') }
  if (!records.length || records.some(({ address }) => isPrivateIp(address))) throw new ApiError(400, 'Cette adresse pointe vers un réseau privé et ne peut pas être importée.')
  return records
}

function requestOnce(url, addresses, requestImpl) {
  const transport = url.protocol === 'https:' ? https : http
  const request = requestImpl || transport.request.bind(transport)
  return new Promise((resolve, reject) => {
    const lookup = (_hostname, options, callback) => {
      if (options?.all) return callback(null, addresses)
      return callback(null, addresses[0].address, addresses[0].family)
    }
    const req = request(url, { method: 'GET', headers: { 'user-agent': 'NovyataOfferImporter/1.0 (+public job offer import)', accept: 'text/html,application/xhtml+xml;q=0.9' }, lookup, timeout: REQUEST_TIMEOUT_MS, maxHeaderSize: 16 * 1024 })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.on('response', (response) => {
      const chunks = []
      let size = 0
      response.on('data', (chunk) => {
        size += chunk.length
        if (size > MAX_RESPONSE_BYTES) response.destroy(new ApiError(413, 'La page de cette offre est trop volumineuse.'))
        else chunks.push(chunk)
      })
      response.on('error', reject)
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.end()
  })
}

function decodeEntities(text) {
  return text.replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

function plainText(html) {
  return decodeEntities(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|svg|noscript|iframe|nav|footer|header)[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|article|section|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t\f\v]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function metaContent(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])[^>]*>`, 'i'))?.[0]
  return tag?.match(/content=["']([^"']*)["']/i)?.[1] || ''
}

function findJobPosting(html) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []
  for (const script of scripts) {
    const source = script.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')
    try {
      const parsed = JSON.parse(source)
      const entries = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])]
      const posting = entries.find((entry) => (Array.isArray(entry['@type']) ? entry['@type'] : [entry['@type']]).includes('JobPosting'))
      if (posting) return posting
    } catch { /* Ignore malformed or unrelated structured data. */ }
  }
  return null
}

export function extractOfferFields(html) {
  const posting = findJobPosting(html)
  const pageTitle = plainText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || metaContent(html, 'og:title'))
  const description = posting?.description ? plainText(posting.description) : plainText(html.replace(/<head\b[\s\S]*?<\/head>/i, ' '))
  const address = posting?.jobLocation?.address || posting?.jobLocation?.[0]?.address || {}
  const salary = posting?.baseSalary?.value?.value ?? posting?.baseSalary?.value?.minValue ?? posting?.baseSalary?.value
  const result = {
    companyName: posting?.hiringOrganization?.name || metaContent(html, 'og:site_name') || '',
    jobTitle: posting?.title || pageTitle.split(/\s+[|–—-]\s+/)[0] || '',
    description: description.slice(0, 20_000),
    location: [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(', '),
    contractType: Array.isArray(posting?.employmentType) ? posting.employmentType.join(', ') : posting?.employmentType || '',
    remote: /TELECOMMUTE|REMOTE/i.test(JSON.stringify(posting?.jobLocationType || '')) ? 'Télétravail détecté' : '',
    salary: salary ? String(salary) : '',
  }
  result.warnings = ['companyName', 'jobTitle', 'location', 'contractType', 'remote', 'salary'].filter((key) => !result[key]).map((key) => ({ companyName: 'Entreprise non détectée.', jobTitle: 'Poste non détecté.', location: 'Localisation non détectée.', contractType: 'Type de contrat non détecté.', remote: 'Information sur le télétravail non détectée.', salary: 'Salaire non détecté.' })[key])
  if (result.description.length < 80) throw new ApiError(422, 'Aucune description d’offre suffisante n’a été trouvée. Vous pouvez la coller manuellement.')
  return result
}

export async function importOfferFromUrl(value, { resolver = dns.lookup, requestImpl } = {}) {
  let url = validateOfferUrl(value)
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const addresses = await resolvePublicAddresses(url.hostname, resolver)
    let response
    try { response = await requestOnce(url, addresses, requestImpl) } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(422, 'Impossible de récupérer cette page. Vous pouvez coller l’offre manuellement.')
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects === MAX_REDIRECTS) throw new ApiError(422, 'Cette page redirige trop souvent. Vous pouvez coller l’offre manuellement.')
      const location = response.headers.location
      if (!location) throw new ApiError(422, 'La page de cette offre est inaccessible.')
      url = validateOfferUrl(new URL(location, url).href)
      continue
    }
    if (response.status < 200 || response.status >= 300) throw new ApiError(422, 'Le site a refusé la récupération. Vous pouvez coller l’offre manuellement.')
    const contentType = String(response.headers['content-type'] || '')
    if (!/(text\/html|application\/xhtml\+xml)/i.test(contentType)) throw new ApiError(415, 'Cette URL ne contient pas une page HTML publique exploitable.')
    return { sourceUrl: url.href, ...extractOfferFields(response.body) }
  }
}
