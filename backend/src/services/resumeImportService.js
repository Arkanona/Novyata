import { Writable } from 'node:stream'
import formidable from 'formidable'
import mammoth from 'mammoth'
import ApiError from '../utils/ApiError.js'

export const MAX_RESUME_UPLOAD_BYTES = 5 * 1024 * 1024
export const MAX_RESUME_TEXT_CHARS = 40_000
export const MAX_RESUME_PDF_PAGES = 10

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const months = 'jan(?:v(?:ier)?)?|f[eé]v(?:r(?:ier)?)?|mars?|avr(?:il)?|mai|juin|juil(?:let)?|ao[uû]t|sept?(?:embre)?|oct(?:obre)?|nov(?:embre)?|d[eé]c(?:embre)?'
const dateLine = new RegExp(`(?:\\b(?:${months})\\.?\\s+)?(?:19|20)\\d{2}\\s*(?:[-–—]|\\b(?:à|au|jusqu['’]à)\\b)\\s*(?:(?:${months})\\.?\\s+)?(?:(?:19|20)\\d{2}|aujourd['’]hui|présent|en cours)`, 'i')
const monthNumbers = { jan: '01', fev: '02', mar: '03', avr: '04', mai: '05', juin: '06', juil: '07', aou: '08', sep: '09', oct: '10', nov: '11', dec: '12' }

function normalizeText(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[\u200b-\u200f\ufeff]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_RESUME_TEXT_CHARS)
}

function validateUpload(file, buffer) {
  if (!file || !Buffer.isBuffer(buffer) || buffer.length === 0) throw new ApiError(400, 'Sélectionnez un fichier CV non vide.')
  if (buffer.length > MAX_RESUME_UPLOAD_BYTES || file.size > MAX_RESUME_UPLOAD_BYTES) throw new ApiError(413, 'Le fichier dépasse la taille maximale de 5 Mo.')

  const extension = String(file.originalFilename || '').split('.').pop()?.toLowerCase()
  const mime = String(file.mimetype || '').toLowerCase()
  const isPdf = extension === 'pdf' && (mime === PDF_MIME || mime === 'application/octet-stream' || !mime) && buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  const isDocx = extension === 'docx' && (mime === DOCX_MIME || mime === 'application/octet-stream' || !mime) && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  if (!isPdf && !isDocx) throw new ApiError(415, 'Format non pris en charge. Importez un fichier PDF ou DOCX valide.')
  return isPdf ? 'pdf' : 'docx'
}

function assertSafeDocxArchive(buffer) {
  // Read the ZIP central directory before Mammoth opens XML. This rejects encrypted,
  // excessively expanded, or entry-heavy files without extracting anything to disk.
  const min = Math.max(0, buffer.length - 65_557)
  let endOffset = -1
  for (let offset = buffer.length - 22; offset >= min; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) { endOffset = offset; break }
  }
  if (endOffset < 0) throw new ApiError(400, 'Le document DOCX est incomplet ou invalide.')
  const entries = buffer.readUInt16LE(endOffset + 10)
  const centralSize = buffer.readUInt32LE(endOffset + 12)
  let cursor = buffer.readUInt32LE(endOffset + 16)
  const centralEnd = cursor + centralSize
  if (!entries || entries > 1000 || centralEnd > endOffset) throw new ApiError(400, 'Le document DOCX contient une structure invalide.')

  let uncompressedTotal = 0
  let hasDocumentXml = false
  for (let index = 0; index < entries; index += 1) {
    if (cursor + 46 > centralEnd || buffer.readUInt32LE(cursor) !== 0x02014b50) throw new ApiError(400, 'Le document DOCX contient une structure invalide.')
    const flags = buffer.readUInt16LE(cursor + 8)
    if (flags & 0x0001) throw new ApiError(400, 'Les documents DOCX chiffrés ne peuvent pas être importés.')
    const uncompressedSize = buffer.readUInt32LE(cursor + 24)
    const filenameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const recordLength = 46 + filenameLength + extraLength + commentLength
    if (cursor + recordLength > centralEnd) throw new ApiError(400, 'Le document DOCX contient une structure invalide.')
    const filename = buffer.subarray(cursor + 46, cursor + 46 + filenameLength).toString('utf8')
    if (filename === 'word/document.xml') hasDocumentXml = true
    uncompressedTotal += uncompressedSize
    if (uncompressedTotal > 20 * 1024 * 1024) throw new ApiError(413, 'Le document DOCX contient trop de données décompressées.')
    cursor += recordLength
  }
  if (!hasDocumentXml) throw new ApiError(400, 'Ce fichier DOCX ne contient pas de document Word valide.')
}

async function extractPdf(buffer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, disableFontFace: true, useSystemFonts: false })
  try {
    const document = await task.promise
    if (!document.numPages || document.numPages > MAX_RESUME_PDF_PAGES) throw new ApiError(413, `Le PDF doit contenir au maximum ${MAX_RESUME_PDF_PAGES} pages.`)
    const pages = []
    let charCount = 0
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const reader = page.streamTextContent({ includeMarkedContent: false }).getReader()
      const pageParts = []
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const chunk = value.items.map((item) => `${item.str || ''}${item.hasEOL ? '\n' : ' '}`).join('')
          charCount += chunk.length
          if (charCount > MAX_RESUME_TEXT_CHARS * 2) {
            await reader.cancel().catch(() => {})
            throw new ApiError(413, 'Le texte du PDF est trop volumineux pour être importé.')
          }
          pageParts.push(chunk)
        }
      } finally {
        reader.releaseLock()
        page.cleanup()
      }
      pages.push(pageParts.join(''))
    }
    return pages.join('\n')
  } finally {
    await Promise.resolve(task.destroy?.()).catch(() => {})
  }
}

function cleanHeading(line) {
  return line.toLocaleLowerCase('fr-FR').replace(/[\s:：•·|—–-]+$/g, '').trim()
}

const sectionMatchers = [
  ['summary', /^(profil|profile|r[eé]sum[eé]|pr[eé]sentation|[àa] propos(?: de moi)?|about me|summary)$/i],
  ['experiences', /^(exp[eé]riences?(?: professionnelles?)?|professional experience|career|parcours professionnel|exp[eé]rience professionnelle)$/i],
  ['educations', /^(formations?|education|educations|parcours acad[eé]mique|dipl[oô]mes?)$/i],
  ['skills', /^(comp[eé]tences?|skills|expertise|outils? et technologies)$/i],
  ['languages', /^(langues?|languages?)$/i],
]

function splitSections(lines) {
  const sections = { header: [], summary: [], experiences: [], educations: [], skills: [], languages: [] }
  let current = 'header'
  for (const line of lines) {
    const normalized = cleanHeading(line.replace(/^#+\s*/, ''))
    const match = sectionMatchers.find(([, matcher]) => matcher.test(normalized))
    if (match) { current = match[0]; continue }
    sections[current].push(line)
  }
  return sections
}

function looksLikeName(line) {
  const words = line.trim().split(/\s+/)
  return words.length >= 2 && words.length <= 4 && words.every((word) => /^[\p{L}][\p{L}'’.-]*$/u.test(word))
}

function segmentEntries(lines, kind) {
  const meaningful = lines.map((line) => line.trim()).filter(Boolean)
  if (!meaningful.length) return []
  const groups = []
  let current = []
  for (const line of meaningful) {
    if (dateLine.test(line) && current.some((entry) => dateLine.test(entry))) { groups.push(current); current = [] }
    current.push(line)
  }
  if (current.length) groups.push(current)
  return groups.slice(0, 12).map((group) => {
    const date = group.find((line) => dateLine.test(line)) || ''
    const body = group.filter((line) => line !== date && !/^[-•*]\s*/.test(line))
    const title = body[0] || ''
    const organization = body[1] || ''
    const descriptionLines = body.slice(2)
    const period = [...date.matchAll(new RegExp(`(${months})\\.?\\s+((?:19|20)\\d{2})`, 'gi'))]
    const toDate = (match) => {
      const monthToken = match[1].toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const monthNumber = monthToken.startsWith('juil') ? '07' : monthToken.startsWith('juin') ? '06' : monthNumbers[monthToken.slice(0, 3)]
      return `${match[2]}-${monthNumber}-01`
    }
    const startDate = period[0] ? toDate(period[0]) : ''
    const isCurrent = /présent|aujourd['’]hui|en cours/i.test(date)
    const endDate = period[1] ? toDate(period[1]) : ''
    const periodNeedsPreserving = Boolean(date && !startDate)
    const description = `${periodNeedsPreserving ? `${date}\n` : ''}${descriptionLines.join('\n')}`.trim().slice(0, 2000)
    const shared = { city: '', start_date: startDate, end_date: isCurrent ? '' : endDate, description, date_text: date }
    if (kind === 'experiences') return { job_title: title.slice(0, 160), company: organization.slice(0, 160), is_current: isCurrent, ...shared }
    return { degree: title.slice(0, 200), school: organization.slice(0, 160), ...shared }
  })
}

function splitTags(lines, { language = false } = {}) {
  const tags = lines.flatMap((line) => line.split(/[,;|•·]/)
    .map((part) => part.replace(/^[-*]\s*/, '').trim())
    .filter((part) => part.length >= 2 && part.length <= 60 && !/[.!?]/.test(part)))
  return [...new Set(tags.slice(0, 30))].map((name) => ({ name, level: language ? '' : '' }))
}

export function structureResumeText(text) {
  const normalized = normalizeText(text)
  if (normalized.length < 40) throw new ApiError(422, 'Aucun texte exploitable n’a été trouvé. Essayez un PDF contenant du texte ou un autre fichier DOCX.')
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean)
  const sections = splitSections(lines)
  const header = sections.header
  const email = normalized.match(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/u)?.[0] || ''
  const phone = normalized.match(/(?:\+?\d[\d .()/-]{7,}\d)/)?.[0]?.trim() || ''
  const cityLine = normalized.match(/(?:ville|localisation|city)\s*[:：-]\s*([^\n|]+)/i)?.[1]?.trim() || ''
  const nameLine = header.find(looksLikeName) || ''
  const nameParts = nameLine.split(/\s+/)
  const nameIndex = nameLine ? header.indexOf(nameLine) : -1
  const jobTitle = nameIndex >= 0 ? header.slice(nameIndex + 1).find((line) => !line.includes('@') && !/^(?:https?:\/\/|www\.|\+?\d[\d .()/-]{7,})/i.test(line) && line.length < 140) || '' : ''
  const needsReview = ['title_resume', 'first_name', 'last_name', 'job_title']
  if (!sections.summary.length) needsReview.push('summary')
  // Role / organization/date grouping is heuristic; always ask users to check these sections.
  needsReview.push('experiences', 'educations', 'dates')
  if (!sections.skills.length) needsReview.push('skills')
  // Language proficiency is never inferred from a mention of the language alone.
  needsReview.push('languages')

  return {
    title_resume: nameLine ? `CV ${nameLine}`.slice(0, 120) : '',
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' '),
    job_title: jobTitle,
    email,
    phone,
    city: cityLine,
    summary: sections.summary.join('\n').slice(0, 2000),
    experiences: segmentEntries(sections.experiences, 'experiences'),
    educations: segmentEntries(sections.educations, 'educations'),
    skills: splitTags(sections.skills),
    languages: splitTags(sections.languages, { language: true }),
    needs_review: [...new Set(needsReview)],
    raw_text: normalized,
  }
}

export async function parseResumeFile(file, buffer) {
  const format = validateUpload(file, buffer)
  let extracted
  try {
    if (format === 'pdf') extracted = await extractPdf(buffer)
    else {
      assertSafeDocxArchive(buffer)
      const result = await mammoth.extractRawText({ buffer })
      extracted = result.value
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(422, 'Ce document n’a pas pu être lu. Vérifiez qu’il n’est pas protégé par un mot de passe et réessayez.')
  }
  const text = normalizeText(extracted)
  return { format, ...structureResumeText(text) }
}

export function parseResumeMultipart(request) {
  let fileBuffer = null
  const form = formidable({
    maxFiles: 1,
    maxFields: 0,
    maxFileSize: MAX_RESUME_UPLOAD_BYTES,
    maxTotalFileSize: MAX_RESUME_UPLOAD_BYTES,
    allowEmptyFiles: false,
    minFileSize: 1,
    fileWriteStreamHandler() {
      const chunks = []
      const sink = new Writable({
        write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback() },
        final(callback) { fileBuffer = Buffer.concat(chunks); chunks.length = 0; callback() },
      })
      return sink
    },
  })

  return new Promise((resolve, reject) => {
    form.parse(request, (error, fields, files) => {
      if (error) {
        if (error.code === 1009 || error.code === 1015 || error.code === 1016) return reject(new ApiError(413, 'Le fichier dépasse la taille maximale de 5 Mo.'))
        return reject(new ApiError(400, 'Le formulaire d’import est invalide.'))
      }
      const uploaded = Object.values(files || {}).flat().filter(Boolean)
      if (uploaded.length !== 1 || !fileBuffer) return reject(new ApiError(400, 'Sélectionnez un seul fichier PDF ou DOCX.'))
      resolve(parseResumeFile(uploaded[0], fileBuffer))
    })
  })
}
