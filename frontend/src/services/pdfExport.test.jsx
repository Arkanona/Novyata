import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import ResumePdfDocument from '../components/resume/ResumePdfDocument'
import { A4_RENDER_HEIGHT_PX, exceedsSingleA4Page, PdfContentOverflowError, PDF_OVERFLOW_MESSAGE, pdfFilename } from './pdfExport'

const resume = {
  first_name: 'Élise', last_name: 'Durand', title_resume: 'CV Développeuse web', job_title: 'Développeuse',
  accent_color: '#3F6B5B', font_size: 'large', experiences: [], educations: [], skills: [], languages: [],
}

describe('Vue PDF du CV', () => {
  afterEach(cleanup)

  it.each(['classic', 'modern', 'minimal'])('réutilise le template %s avec ses préférences', (template_key) => {
    const { container } = render(<ResumePdfDocument resume={{ ...resume, template_key }} />)
    expect(container.querySelector('.template-' + template_key)).toBeTruthy()
    expect(container.querySelector('.font-large')).toBeTruthy()
    expect(container.querySelector('.resume-preview-paper')).toBeTruthy()
    expect(container.querySelector('.template-preview').style.getPropertyValue('--resume-accent')).toBe('#3F6B5B')
  })

  it.each([
    ['classic', 'small', '#314A67'],
    ['modern', 'normal', '#7A4B4B'],
    ['minimal', 'large', '#3F6B5B'],
  ])('conserve le template %s, la taille %s et la couleur %s', (template_key, font_size, accent_color) => {
    const { container } = render(<ResumePdfDocument resume={{ ...resume, template_key, font_size, accent_color }} />)
    const preview = container.querySelector('.template-preview')

    expect(preview.classList.contains('template-' + template_key)).toBe(true)
    expect(preview.classList.contains('font-' + font_size)).toBe(true)
    expect(preview.style.getPropertyValue('--resume-accent')).toBe(accent_color)
    expect(container.querySelector('.pdf-export-action')).toBeNull()
  })

  it('accepte un CV court ou proche de la limite A4', () => {
    expect(exceedsSingleA4Page(A4_RENDER_HEIGHT_PX - 120)).toBe(false)
    expect(exceedsSingleA4Page(A4_RENDER_HEIGHT_PX)).toBe(false)
  })

  it('bloque un CV qui dépasse nettement une page A4 avec un message explicite', () => {
    expect(exceedsSingleA4Page(A4_RENDER_HEIGHT_PX + 1)).toBe(true)
    const error = new PdfContentOverflowError()
    expect(error.code).toBe('PDF_CONTENT_OVERFLOW')
    expect(error.message).toBe(PDF_OVERFLOW_MESSAGE)
  })

  it('crée un nom de fichier propre', () => {
    expect(pdfFilename(resume)).toBe('CV_Developpeuse_web.pdf')
    expect(pdfFilename({ first_name: 'Élise', last_name: 'Durand' })).toBe('CV_Elise_Durand.pdf')
  })
})
