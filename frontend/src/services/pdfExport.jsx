import { createRoot } from 'react-dom/client'
import ResumePdfDocument from '../components/resume/ResumePdfDocument'

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

export function pdfFilename(resume) {
  const source = resume.title_resume || ['CV', resume.first_name, resume.last_name].filter(Boolean).join('_')
  const sanitized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
  return (sanitized || 'CV_Novyata') + '.pdf'
}

export async function exportResumePdf(resume) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const host = document.createElement('div')
  host.className = 'resume-pdf-export-host'
  document.body.append(host)
  const root = createRoot(host)
  try {
    root.render(<ResumePdfDocument resume={resume} />)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    await document.fonts?.ready
    const paper = host.querySelector('.resume-preview-paper')
    if (!paper) throw new Error('L’aperçu du CV est indisponible pour l’export.')
    const canvas = await html2canvas(paper, { backgroundColor: '#FFFFFF', scale: 2, useCORS: true, logging: false, windowWidth: paper.scrollWidth, windowHeight: paper.scrollHeight })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    const scale = Math.min(A4_WIDTH_MM / canvas.width, A4_HEIGHT_MM / canvas.height)
    const width = canvas.width * scale
    const height = canvas.height * scale
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (A4_WIDTH_MM - width) / 2, (A4_HEIGHT_MM - height) / 2, width, height, undefined, 'FAST')
    pdf.save(pdfFilename(resume))
  } finally {
    root.unmount()
    host.remove()
  }
}
