import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import ResumePdfDocument from '../components/resume/ResumePdfDocument'
import { pdfFilename } from './pdfExport'

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

  it('crée un nom de fichier propre', () => {
    expect(pdfFilename(resume)).toBe('CV_Developpeuse_web.pdf')
    expect(pdfFilename({ first_name: 'Élise', last_name: 'Durand' })).toBe('CV_Elise_Durand.pdf')
  })
})
