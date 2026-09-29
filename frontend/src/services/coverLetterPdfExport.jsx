import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import CoverLetterPreview from '../components/coverLetters/CoverLetterPreview'
import { A4_HEIGHT_MM, A4_RENDER_HEIGHT_PX, A4_RENDER_WIDTH_PX, A4_WIDTH_MM, exceedsSingleA4Page } from './pdfExport'

const OVERFLOW_MESSAGE = 'Votre lettre dépasse une page A4. Réduisez le contenu avant l’export.'

function cleanName(value) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
}

export function coverLetterPdfFilename(letter, resume, user) {
  const company = cleanName(letter.company_name) || 'Entreprise'
  const firstName = cleanName(resume?.first_name || user?.first_name) || 'Prenom'
  const lastName = cleanName(resume?.last_name || user?.last_name) || 'Nom'
  return `Lettre_${company}_${firstName}_${lastName}.pdf`
}

export async function exportCoverLetterPdf(letter, resume, user) {
  const host = document.createElement('div')
  host.className = 'cover-letter-pdf-export-host'
  document.body.append(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(<CoverLetterPreview letter={letter} resume={resume} user={user} pdf />))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    await document.fonts?.ready
    const paper = host.querySelector('.cover-letter-paper')
    if (!paper) throw new Error('L’aperçu de la lettre est indisponible pour l’export.')
    if (exceedsSingleA4Page(Math.max(paper.scrollHeight, paper.offsetHeight, paper.clientHeight))) throw new Error(OVERFLOW_MESSAGE)
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const canvas = await html2canvas(paper, { backgroundColor: '#FFFFFF', scale: 3, useCORS: true, logging: false, windowWidth: A4_RENDER_WIDTH_PX, windowHeight: A4_RENDER_HEIGHT_PX })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST')
    pdf.save(coverLetterPdfFilename(letter, resume, user))
  } finally {
    root.unmount()
    host.remove()
  }
}
