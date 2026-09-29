import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import ResumePdfDocument from '../components/resume/ResumePdfDocument'

export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297
export const A4_RENDER_WIDTH_PX = 594
export const A4_RENDER_HEIGHT_PX = 842
export const PDF_OVERFLOW_MESSAGE = 'Votre CV dépasse une page A4. Réduisez certaines informations ou choisissez une taille de texte plus petite avant l’export.'

export class PdfContentOverflowError extends Error {
  constructor() {
    super(PDF_OVERFLOW_MESSAGE)
    this.name = 'PdfContentOverflowError'
    this.code = 'PDF_CONTENT_OVERFLOW'
  }
}

export function exceedsSingleA4Page(contentHeight) {
  return Number(contentHeight) > A4_RENDER_HEIGHT_PX
}

function contentHeightOf(paper) {
  return Math.max(paper.scrollHeight, paper.offsetHeight, paper.clientHeight)
}

export function pdfFilename(resume) {
  const source = resume.title_resume || ['CV', resume.first_name, resume.last_name].filter(Boolean).join('_')
  const sanitized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
  return (sanitized || 'CV_Novyata') + '.pdf'
}

export async function exportResumePdf(resume) {
  const host = document.createElement('div')
  host.className = 'resume-pdf-export-host'
  document.body.append(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(<ResumePdfDocument resume={resume} />))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    await document.fonts?.ready
    const paper = host.querySelector('.resume-preview-paper')
    if (!paper) throw new Error('L’aperçu du CV est indisponible pour l’export.')

    if (exceedsSingleA4Page(contentHeightOf(paper))) throw new PdfContentOverflowError()

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const canvas = await html2canvas(paper, {
      backgroundColor: '#FFFFFF',
      scale: 3,
      useCORS: true,
      logging: false,
      windowWidth: A4_RENDER_WIDTH_PX,
      windowHeight: A4_RENDER_HEIGHT_PX,
    })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST')
    pdf.save(pdfFilename(resume))
  } finally {
    root.unmount()
    host.remove()
  }
}
