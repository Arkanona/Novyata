import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'

const { pdfPage, destroyPdf, extractRawText, getDocument } = vi.hoisted(() => ({ pdfPage: vi.fn(), destroyPdf: vi.fn(), extractRawText: vi.fn(), getDocument: vi.fn() }))
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ getDocument: (...args) => getDocument(...args) }))
vi.mock('mammoth', () => ({ default: { extractRawText } }))

import { MAX_RESUME_UPLOAD_BYTES, parseResumeFile, parseResumeMultipart, structureResumeText } from '../src/services/resumeImportService.js'
import ApiError from '../src/utils/ApiError.js'

function makeDocxBuffer() {
  const filename = Buffer.from('word/document.xml')
  const content = Buffer.from('<w:document/>')
  const local = Buffer.alloc(30 + filename.length + content.length)
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(filename.length, 26)
  filename.copy(local, 30); content.copy(local, 30 + filename.length)
  const central = Buffer.alloc(46 + filename.length)
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt32LE(content.length, 24); central.writeUInt16LE(filename.length, 28)
  filename.copy(central, 46)
  const end = Buffer.alloc(22)
  const centralOffset = local.length
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(centralOffset, 16)
  return Buffer.concat([local, central, end])
}

function textReader(items) {
  let sent = false
  return { read: async () => sent ? { done: true } : (sent = true, { done: false, value: { items } }), cancel: vi.fn().mockResolvedValue(), releaseLock: vi.fn() }
}

function makeTextPdf(lines) {
  const commands = ['BT /F1 11 Tf 72 730 Td', ...lines.flatMap((line) => [`(${line.replace(/[\\()]/g, '\\$&')}) Tj`, '0 -16 Td']), 'ET'].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`,
  ]
  let source = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((body, index) => { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${body}\nendobj\n` })
  const xrefOffset = Buffer.byteLength(source)
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(source, 'binary')
}

describe('resumeImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: pdfPage }), destroy: destroyPdf })
    pdfPage.mockResolvedValue({ streamTextContent: vi.fn(() => ({ getReader: () => textReader([{ str: 'Camille Dubois', hasEOL: true }, { str: 'Product Designer', hasEOL: true }, { str: 'camille@example.com', hasEOL: true }, { str: 'PROFIL', hasEOL: true }, { str: 'Designer produit avec cinq ans d’expérience en recherche utilisateur et prototypage.', hasEOL: true }, { str: 'COMPÉTENCES', hasEOL: true }, { str: 'Figma, recherche utilisateur, prototypage', hasEOL: true }]) })), cleanup: vi.fn() })
    extractRawText.mockResolvedValue({ value: 'Camille Dubois\nProduct Designer\ncamille@example.com\nPROFIL\nDesigner produit avec cinq ans d’expérience en recherche utilisateur et prototypage.\nCOMPÉTENCES\nFigma, recherche utilisateur, prototypage' })
  })

  it('extracts text from a valid text-based PDF and suggests fields for review', async () => {
    const parsed = await parseResumeFile({ originalFilename: 'cv.pdf', mimetype: 'application/pdf', size: 20 }, Buffer.from('%PDF-test'))
    expect(parsed).toMatchObject({ format: 'pdf', first_name: 'Camille', last_name: 'Dubois', job_title: 'Product Designer', email: 'camille@example.com' })
    expect(parsed.skills).toEqual(expect.arrayContaining([{ name: 'Figma', level: '' }]))
    expect(parsed.needs_review).toContain('experiences')
    expect(parsed.raw_text).toContain('Designer produit avec cinq ans')
  })

  it('extracts a real PDF through PDF.js rather than trusting the file extension', async () => {
    const pdfjs = await vi.importActual('pdfjs-dist/legacy/build/pdf.mjs')
    getDocument.mockImplementation(pdfjs.getDocument)
    const text = ['Camille Dubois', 'Product Designer', 'camille@example.com', 'PROFILE', 'Product designer experienced in research and prototyping for digital products.', 'SKILLS', 'Figma, User research, Prototyping']
    const buffer = makeTextPdf(text)
    const parsed = await parseResumeFile({ originalFilename: 'cv.pdf', mimetype: 'application/pdf', size: buffer.length }, buffer)
    expect(parsed.format).toBe('pdf')
    expect(parsed.raw_text).toContain('Product designer experienced in research')
    expect(parsed.first_name).toBe('Camille')
    expect(parsed.skills.map((skill) => skill.name)).toEqual(expect.arrayContaining(['Figma', 'User research']))
  })

  it('accepts one multipart upload into bounded memory without writing a temporary file', async () => {
    const boundary = 'novyata-cv-upload-boundary'
    const file = Buffer.from('%PDF-test')
    const multipart = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="cv.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      file,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    const request = Readable.from([multipart])
    request.headers = { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(multipart.length) }
    await expect(parseResumeMultipart(request)).resolves.toMatchObject({ format: 'pdf', first_name: 'Camille' })
  })

  it('extracts raw paragraph text from a DOCX without requiring a filesystem path', async () => {
    const parsed = await parseResumeFile({ originalFilename: 'cv.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 120 }, makeDocxBuffer())
    expect(extractRawText).toHaveBeenCalledWith({ buffer: expect.any(Buffer) })
    expect(parsed.format).toBe('docx')
    expect(parsed.first_name).toBe('Camille')
  })

  it('extracts a real DOCX package with Mammoth and identifies uncertainty for user review', async () => {
    const mammoth = await vi.importActual('mammoth')
    extractRawText.mockImplementation(mammoth.default.extractRawText)
    const buffer = await readFile(new URL('../node_modules/mammoth/test/test-data/tables.docx', import.meta.url))
    const parsed = await parseResumeFile({ originalFilename: 'cv.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: buffer.length }, buffer)
    expect(parsed.format).toBe('docx')
    expect(parsed.raw_text.length).toBeGreaterThan(40)
    expect(parsed.needs_review).toContain('title_resume')
  })

  it('rejects a mismatched or unsupported file type', async () => {
    await expect(parseResumeFile({ originalFilename: 'cv.pdf', mimetype: 'text/plain', size: 4 }, Buffer.from('%PDF'))).rejects.toMatchObject({ statusCode: 415 })
    await expect(parseResumeFile({ originalFilename: 'cv.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 4 }, Buffer.from('PK\x03\x04'))).rejects.toMatchObject({ statusCode: 400 })
    expect(extractRawText).not.toHaveBeenCalled()
  })

  it('rejects a DOCX archive whose declared expanded content exceeds the safety limit', async () => {
    const archive = makeDocxBuffer()
    const centralDirectoryOffset = archive.readUInt32LE(archive.length - 6)
    archive.writeUInt32LE(21 * 1024 * 1024, centralDirectoryOffset + 24)
    await expect(parseResumeFile({ originalFilename: 'cv.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: archive.length }, archive))
      .rejects.toMatchObject({ statusCode: 413 })
    expect(extractRawText).not.toHaveBeenCalled()
  })

  it('rejects files over the memory and upload limit before parsing', async () => {
    await expect(parseResumeFile({ originalFilename: 'cv.pdf', mimetype: 'application/pdf', size: MAX_RESUME_UPLOAD_BYTES + 1 }, Buffer.alloc(MAX_RESUME_UPLOAD_BYTES + 1, 1))).rejects.toMatchObject({ statusCode: 413 })
    expect(extractRawText).not.toHaveBeenCalled()
  })

  it('rejects PDFs over the configured page limit', async () => {
    getDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 11 }), destroy: destroyPdf })
    await expect(parseResumeFile({ originalFilename: 'cv.pdf', mimetype: 'application/pdf', size: 10 }, Buffer.from('%PDF-test'))).rejects.toMatchObject({ statusCode: 413 })
  })

  it('marks uncertain or missing sections and refuses documents with no usable text', () => {
    const parsed = structureResumeText('Camille Dubois\nProduct Designer\ncamille@example.com\nUne présentation professionnelle suffisamment longue pour être conservée.')
    expect(parsed.needs_review).toEqual(expect.arrayContaining(['title_resume', 'first_name', 'job_title', 'experiences', 'skills', 'languages']))
    expect(() => structureResumeText('no text')).toThrowError(ApiError)
  })

  it('maps explicit month/year periods and preserves unstructured year-only periods for verification', () => {
    const parsed = structureResumeText('Camille Dubois\nProduct Designer\ncamille@example.com\nEXPÉRIENCES\navr 2022 — août 2024\nProduct Designer\nStudio Nova\nConception de parcours numériques.\n2020 — 2021\nUX Designer\nAtelier UX\nRecherche utilisateur et prototypage.')
    expect(parsed.experiences).toHaveLength(2)
    expect(parsed.experiences[0]).toMatchObject({ start_date: '2022-04-01', end_date: '2024-08-01', job_title: 'Product Designer', company: 'Studio Nova' })
    expect(parsed.experiences[1].start_date).toBe('')
    expect(parsed.experiences[1].description).toContain('2020 — 2021')
    expect(parsed.needs_review).toContain('dates')
  })
})
